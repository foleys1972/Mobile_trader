import SwiftUI

struct MRDLineView: View {
    let line: TradingLine
    @EnvironmentObject var linphoneManager: LinphoneManager
    @State private var isRinging = false
    @State private var callDuration: TimeInterval = 0
    @State private var timer: Timer?
    
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
            
            // MRD specific info
            HStack {
                Image(systemName: "phone.fill")
                    .foregroundColor(.blue)
                
                Text("Manual Ring Down")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                if isRinging {
                    Text("Ringing...")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
            
            // Call duration (if active)
            if line.status == .active {
                HStack {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.green)
                    
                    Text("Duration: \(formatDuration(callDuration))")
                        .font(.caption)
                        .foregroundColor(.green)
                    
                    Spacer()
                }
            }
            
            // Action buttons
            HStack(spacing: 8) {
                if line.status == .ready {
                    Button(action: {
                        initiateCall()
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.fill")
                            Text("Call")
                        }
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.blue)
                        .cornerRadius(8)
                    }
                } else if line.status == .active {
                    Button(action: {
                        endCall()
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.down.fill")
                            Text("End")
                        }
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.red)
                        .cornerRadius(8)
                    }
                }
                
                if line.status == .active {
                    Button(action: {
                        toggleMute()
                    }) {
                        Image(systemName: "mic.slash.fill")
                            .foregroundColor(.gray)
                            .padding(8)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                    }
                    
                    Button(action: {
                        toggleSpeaker()
                    }) {
                        Image(systemName: "speaker.wave.2.fill")
                            .foregroundColor(.blue)
                            .padding(8)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
                
                Spacer()
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
        .onAppear {
            startTimerIfNeeded()
        }
        .onDisappear {
            stopTimer()
        }
    }
    
    private func initiateCall() {
        isRinging = true
        linphoneManager.makeCall(to: line.number, lineType: .mrd)
        
        // Simulate ringing for 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            isRinging = false
            // Update line status to active
            // This would be handled by the LineManager
        }
    }
    
    private func endCall() {
        linphoneManager.endCall(callId: line.id)
        stopTimer()
        callDuration = 0
    }
    
    private func toggleMute() {
        // Toggle mute functionality
        linphoneManager.muteCall(callId: line.id, muted: true)
    }
    
    private func toggleSpeaker() {
        // Toggle speaker functionality
        // Implementation would handle speaker toggle
    }
    
    private func startTimerIfNeeded() {
        if line.status == .active && timer == nil {
            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                callDuration += 1
            }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

struct MRDLineView_Previews: PreviewProvider {
    static var previews: some View {
        MRDLineView(line: TradingLine(
            id: "preview",
            name: "Client A",
            number: "3001",
            type: .mrd,
            status: .ready,
            participants: []
        ))
        .environmentObject(LinphoneManager.shared)
        .padding()
        .previewLayout(.sizeThatFits)
    }
}

