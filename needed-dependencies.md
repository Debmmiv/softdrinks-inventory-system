    # 1. Local Database & Offline Storage (FR8, NFR1)                                                                       
    npx expo install expo-sqlite                                                                                            
                                                                                                                            
    # 2. Network State Detection (FR10)                                                                                     
    npx expo install @react-native-community/netinfo                                                                        
                                                                                                                            
    # 3. UUID Generation & Secure Storage (FR9, NFR3, NFR7)                                                                 
    npx expo install expo-crypto expo-secure-store                                                                          
                                                                                                                            
    # 4. Navigation & UI Icons (FR1, NFR7)                                                                                  
    npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs                       
    npx expo install react-native-screens react-native-safe-area-context @expo/vector-icons                                 
                                                                                                                            
    # 5. API Client for Sync (FR11, FR12, NFR8)                                                                             
    npm install axios   