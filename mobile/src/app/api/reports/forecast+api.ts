import { connectToDatabase } from '../../../server/config/db';
import { Transaction } from '../../../server/models/Transaction';
import { Product } from '../../../server/models/Product';
import { authenticate, requireOwner } from '../../../server/middleware/auth';
import { jsonOk, jsonError } from '../../../server/middleware/response';

/**
 * GET /api/reports/forecast
 * Basic demand forecasting: analyzes historical RELEASE transactions to compute
 * average daily consumption per product, projected days until stockout, and
 * a recommended reorder date.
 *
 * Query params:
 *   lookback_days (default 30): how many days of history to base the forecast on
 *
 * Owner only.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (auth.errorResponse) return auth.errorResponse;

  const ownerCheck = requireOwner(auth.user!);
  if (ownerCheck) return ownerCheck;

  try {
    const url = new URL(req.url);
    const lookbackDays = Math.max(7, Math.min(365, parseInt(url.searchParams.get('lookback_days') || '30', 10) || 30));
    const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    await connectToDatabase();

    // Get all active products
    const products = await Product.find({ is_active: true })
      .sort({ brand_name: 1, product_name: 1 })
      .lean();

    if (products.length === 0) {
      return jsonOk({ lookback_days: lookbackDays, forecasts: [] });
    }

    const productIds = products.map((p) => p._id);

    // Aggregate total RELEASE bottles per product over the lookback window
    const releaseTotals = await Transaction.aggregate([
      {
        $match: {
          product_id: { $in: productIds },
          transaction_type: 'RELEASE',
          created_at: { $gte: lookbackDate },
        },
      },
      {
        $group: {
          _id: '$product_id',
          total_released_bottles: { $sum: { $abs: '$total_bottles_delta' } },
          transaction_count: { $sum: 1 },
          earliest: { $min: '$created_at' },
          latest: { $max: '$created_at' },
        },
      },
    ]);

    // Also get weekly breakdown for trend detection (last 4 weeks)
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const weeklyBreakdown = await Transaction.aggregate([
      {
        $match: {
          product_id: { $in: productIds },
          transaction_type: 'RELEASE',
          created_at: { $gte: fourWeeksAgo },
        },
      },
      {
        $group: {
          _id: {
            product_id: '$product_id',
            week: { $isoWeek: '$created_at' },
            year: { $isoWeekYear: '$created_at' },
          },
          weekly_bottles: { $sum: { $abs: '$total_bottles_delta' } },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    // Build weekly map per product
    const weeklyMap = new Map<string, number[]>();
    for (const w of weeklyBreakdown) {
      const pid = w._id.product_id.toString();
      if (!weeklyMap.has(pid)) weeklyMap.set(pid, []);
      weeklyMap.get(pid)!.push(w.weekly_bottles);
    }

    // Build release lookup
    const releaseMap = new Map<string, (typeof releaseTotals)[0]>();
    for (const r of releaseTotals) {
      releaseMap.set(r._id.toString(), r);
    }

    const now = new Date();
    const forecasts = products.map((product) => {
      const pid = product._id.toString();
      const release = releaseMap.get(pid);

      const currentStock = product.total_stock_bottles;
      const reorderLevel = product.reorder_threshold_bottles;
      const unitsPerCase = product.units_per_case;

      // Calculate average daily consumption
      let avgDailyBottles = 0;
      let totalReleased = 0;
      let releaseCount = 0;

      if (release && release.total_released_bottles > 0) {
        totalReleased = release.total_released_bottles;
        releaseCount = release.transaction_count;

        // Use actual active days (from earliest to latest release, or lookback if only 1 tx)
        const activeDays = releaseCount > 1
          ? Math.max(1, Math.ceil((release.latest.getTime() - release.earliest.getTime()) / (24 * 60 * 60 * 1000)))
          : lookbackDays;

        avgDailyBottles = totalReleased / activeDays;
      }

      // Days until stockout (at current rate)
      const daysUntilStockout = avgDailyBottles > 0
        ? Math.floor(currentStock / avgDailyBottles)
        : currentStock > 0 ? 999 : 0;

      // Days until hitting reorder level
      const stockAboveReorder = Math.max(0, currentStock - reorderLevel);
      const daysUntilReorder = avgDailyBottles > 0
        ? Math.floor(stockAboveReorder / avgDailyBottles)
        : stockAboveReorder > 0 ? 999 : 0;

      // Recommended reorder date
      let reorderDate: string | null = null;
      if (daysUntilReorder < 999 && daysUntilReorder >= 0) {
        const d = new Date(now.getTime() + daysUntilReorder * 24 * 60 * 60 * 1000);
        reorderDate = d.toISOString().split('T')[0];
      }

      // Trend detection from weekly data
      const weeks = weeklyMap.get(pid) || [];
      let trend: 'rising' | 'falling' | 'stable' | 'no_data' = 'no_data';
      if (weeks.length >= 2) {
        const firstHalf = weeks.slice(0, Math.ceil(weeks.length / 2));
        const secondHalf = weeks.slice(Math.ceil(weeks.length / 2));
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const change = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;
        if (change > 0.15) trend = 'rising';
        else if (change < -0.15) trend = 'falling';
        else trend = 'stable';
      }

      // Urgency level
      let urgency: 'critical' | 'warning' | 'ok' | 'overstocked' = 'ok';
      if (currentStock <= 0) urgency = 'critical';
      else if (daysUntilStockout <= 3) urgency = 'critical';
      else if (daysUntilStockout <= 7 || currentStock <= reorderLevel) urgency = 'warning';
      else if (avgDailyBottles > 0 && currentStock > reorderLevel * 3) urgency = 'overstocked';

      // Convert avg daily to cases and bottles for display
      const avgDailyCases = unitsPerCase > 0 ? Math.floor(avgDailyBottles / unitsPerCase) : 0;
      const avgDailyLoose = unitsPerCase > 0 ? Math.round(avgDailyBottles % unitsPerCase) : Math.round(avgDailyBottles);

      return {
        product_id: pid,
        brand_name: product.brand_name,
        product_name: product.product_name,
        bottle_size: product.bottle_size,
        units_per_case: unitsPerCase,
        current_stock_bottles: currentStock,
        reorder_threshold_bottles: reorderLevel,
        avg_daily_bottles: Math.round(avgDailyBottles * 10) / 10,
        avg_daily_display: avgDailyBottles > 0
          ? (avgDailyCases > 0 ? `${avgDailyCases} case${avgDailyCases !== 1 ? 's' : ''} ${avgDailyLoose} bottle${avgDailyLoose !== 1 ? 's' : ''}` : `${avgDailyLoose} bottle${avgDailyLoose !== 1 ? 's' : ''}`)
          : 'No releases',
        total_released_bottles: totalReleased,
        release_count: releaseCount,
        days_until_stockout: daysUntilStockout,
        days_until_reorder: daysUntilReorder,
        reorder_date: reorderDate,
        trend,
        urgency,
        weekly_demand: weeks,
      };
    });

    // Sort: critical first, then warning, then by days_until_stockout
    const urgencyOrder = { critical: 0, warning: 1, ok: 2, overstocked: 3 };
    forecasts.sort((a, b) => {
      const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (diff !== 0) return diff;
      return a.days_until_stockout - b.days_until_stockout;
    });

    return jsonOk({
      lookback_days: lookbackDays,
      generated_at: now.toISOString(),
      total_products: forecasts.length,
      critical_count: forecasts.filter((f) => f.urgency === 'critical').length,
      warning_count: forecasts.filter((f) => f.urgency === 'warning').length,
      forecasts,
    });
  } catch (error) {
    return jsonError(
      'Failed to generate forecast.',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
