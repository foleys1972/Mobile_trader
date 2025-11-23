import SwiftUI

struct TradingBoardView: View {
    @EnvironmentObject var lineManager: LineManager
    @EnvironmentObject var linphoneManager: LinphoneManager
    @State private var selectedTab = 0
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with connection status
            headerView
            
            // Main trading interface
            TabView(selection: $selectedTab) {
                // Hoot Lines Tab
                HootLinesView()
                    .tabItem {
                        Image(systemName: "speaker.wave.3")
                        Text("Hoot Lines")
                    }
                    .tag(0)
                
                // ARD Lines Tab
                ARDLinesView()
                    .tabItem {
                        Image(systemName: "phone.arrow.down.left")
                        Text("ARD Lines")
                    }
                    .tag(1)
                
                // MRD Lines Tab
                MRDLinesView()
                    .tabItem {
                        Image(systemName: "phone")
                        Text("MRD Lines")
                    }
                    .tag(2)
                
                // DND Tab
                DNDView()
                    .tabItem {
                        Image(systemName: "moon.fill")
                        Text("DND")
                    }
                    .tag(3)
                
                // Settings Tab
                SettingsView()
                    .tabItem {
                        Image(systemName: "gear")
                        Text("Settings")
                    }
                    .tag(4)
            }
            .accentColor(.blue)
        }
        .navigationBarHidden(true)
    }
    
    private var headerView: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Direct Trader")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    HStack {
                        Circle()
                            .fill(linphoneManager.isConnected ? .green : .red)
                            .frame(width: 8, height: 8)
                        
                        Text(linphoneManager.connectionStatus)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Active calls indicator
                if !linphoneManager.activeCalls.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "phone.fill")
                            .foregroundColor(.green)
                        Text("\(linphoneManager.activeCalls.count)")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            
            Divider()
        }
        .background(Color(.systemBackground))
    }
}

struct HootLinesView: View {
    @EnvironmentObject var lineManager: LineManager
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    ForEach(lineManager.hootLines) { line in
                        HootLineView(line: line)
                    }
                }
                .padding()
            }
            .navigationTitle("Hoot Lines")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct ARDLinesView: View {
    @EnvironmentObject var lineManager: LineManager
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    ForEach(lineManager.ardLines) { line in
                        ARDLineView(line: line)
                    }
                }
                .padding()
            }
            .navigationTitle("ARD Lines")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct MRDLinesView: View {
    @EnvironmentObject var lineManager: LineManager
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    ForEach(lineManager.mrdLines) { line in
                        MRDLineView(line: line)
                    }
                }
                .padding()
            }
            .navigationTitle("MRD Lines")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var linphoneManager: LinphoneManager
    @State private var serverAddress = ""
    @State private var username = ""
    @State private var password = ""
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("Connection Settings") {
                    TextField("Server Address", text: $serverAddress)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    TextField("Username", text: $username)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    Button("Connect") {
                        connectToServer()
                    }
                    .disabled(serverAddress.isEmpty || username.isEmpty || password.isEmpty)
                }
                
                Section("Status") {
                    HStack {
                        Text("Connection")
                        Spacer()
                        Text(linphoneManager.connectionStatus)
                            .foregroundColor(linphoneManager.isConnected ? .green : .red)
                    }
                    
                    HStack {
                        Text("Active Calls")
                        Spacer()
                        Text("\(linphoneManager.activeCalls.count)")
                    }
                }
                
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                    }
                    
                    HStack {
                        Text("Build")
                        Spacer()
                        Text("Production")
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Connection", isPresented: $showingAlert) {
                Button("OK") { }
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private func connectToServer() {
        linphoneManager.register(
            server: serverAddress,
            username: username,
            password: password
        )
        
        alertMessage = "Connection attempt initiated"
        showingAlert = true
    }
}

struct TradingBoardView_Previews: PreviewProvider {
    static var previews: some View {
        TradingBoardView()
            .environmentObject(LineManager())
            .environmentObject(LinphoneManager.shared)
    }
}

