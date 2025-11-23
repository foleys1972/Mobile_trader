import SwiftUI

struct ContentView: View {
    @StateObject private var lineManager = LineManager()
    @StateObject private var linphoneManager = LinphoneManager.shared
    
    var body: some View {
        NavigationView {
            TradingBoardView()
                .environmentObject(lineManager)
                .environmentObject(linphoneManager)
        }
        .navigationViewStyle(StackNavigationViewStyle())
        .onAppear {
            // Initialize trading board when app appears
            lineManager.loadConfiguration()
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .previewDevice("iPhone 15 Pro")
            .previewDisplayName("Trading Board")
    }
}

