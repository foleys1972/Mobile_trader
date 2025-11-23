import SwiftUI

struct ARDLineView: View {
    let line: TradingLine
    @EnvironmentObject var linphoneManager: LinphoneManager
    @State private var isConnecting = false
    @State private var showWarning = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with status
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(line.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(line.number)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Status indicator
                HStack(spacing: 4) {
                    Circle()
                        .fill(line.statusColor)
                        .frame(width: 8, height: 8)
                    
                    Text(line.statusText)
                        .font(.caption)
                        .foregroundColor(line.statusColor)
                }
            }
            
            // ARD specific info
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                
                Text("Auto Ring Down")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text("Warning tone enabled")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
            
            // Action buttons
            HStack(spacing: 8) {
                Button(action: {
                    connectARD()
                }) {
                    HStack(spacing: 4) {
                        if isConnecting {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "phone.arrow.down.left.fill")
                        }
                        Text(isConnecting ? "Connecting..." : "Connect")
                    }
                    .font(.caption)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.red)
                    .cornerRadius(8)
                }
                .disabled(isConnecting)
                
                Button(action: {
                    testWarningTone()
                }) {
                    Image(systemName: "speaker.wave.2.fill")
                        .foregroundColor(.orange)
                        .padding(8)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                }
                
                Spacer()
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
        .alert("ARD Warning", isPresented: $showWarning) {
            Button("Continue") {
                proceedWithARD()
            }
            Button("Cancel", role: .cancel) {
                isConnecting = false
            }
        } message: {
            Text("This will immediately connect to \(line.name). A warning tone will be played. Continue?")
        }
    }
    
    private func connectARD() {
        isConnecting = true
        showWarning = true
    }
    
    private func proceedWithARD() {
        // Play warning tone and connect
        playWarningTone {
            // Connect after warning tone
            linphoneManager.makeCall(to: line.number, lineType: .ard)
            isConnecting = false
        }
    }
    
    private func testWarningTone() {
        // Test the warning tone
        playWarningTone {
            // Tone completed
        }
    }
    
    private func playWarningTone(completion: @escaping () -> Void) {
        // Implementation would play the ARD warning tone
        // This is a placeholder for the actual audio implementation
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            completion()
        }
    }
}

struct ARDLineView_Previews: PreviewProvider {
    static var previews: some View {
        ARDLineView(line: TradingLine(
            id: "preview",
            name: "Emergency Line",
            number: "2001",
            type: .ard,
            status: .ready,
            participants: []
        ))
        .environmentObject(LinphoneManager.shared)
        .padding()
        .previewLayout(.sizeThatFits)
    }
}

