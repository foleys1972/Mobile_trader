import SwiftUI

struct HootLineView: View {
    let line: TradingLine
    @EnvironmentObject var linphoneManager: LinphoneManager
    @StateObject private var hootMonitor = HootLineMonitor.shared
    @State private var isExpanded = false
    @State private var showingMonitorOptions = false
    
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
            
            // Participants count
            HStack {
                Image(systemName: "person.2.fill")
                    .foregroundColor(.blue)
                
                Text("\(line.participants.count) participants")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Button(action: {
                    isExpanded.toggle()
                }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.blue)
                }
            }
            
            // Expanded participants list
            if isExpanded && !line.participants.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(line.participants, id: \.self) { participant in
                        HStack {
                            Circle()
                                .fill(.green)
                                .frame(width: 6, height: 6)
                            
                            Text(participant)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Spacer()
                        }
                    }
                }
                .padding(.top, 4)
            }
            
            // Monitoring Status
            if let monitorStatus = hootMonitor.getLineStatus(lineId: line.id) {
                HStack {
                    Image(systemName: monitorStatus.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                        .foregroundColor(monitorStatus.statusColor)
                    
                    Text(monitorStatus.statusText)
                        .font(.caption)
                        .foregroundColor(monitorStatus.statusColor)
                    
                    if let activity = hootMonitor.getAudioActivity(lineId: line.id) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(activity.audioLevelColor)
                                .frame(width: 6, height: 6)
                            
                            Text(activity.audioLevelText)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    Text("\(Int(monitorStatus.monitoringDuration / 60))m")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 4)
                .padding(.horizontal, 8)
                .background(monitorStatus.statusColor.opacity(0.1))
                .cornerRadius(6)
            }
            
            // Action buttons
            HStack(spacing: 8) {
                // Main action button
                Button(action: {
                    if hootMonitor.getLineStatus(lineId: line.id) != nil {
                        // Already monitoring, toggle mute
                        hootMonitor.toggleMute(lineId: line.id)
                    } else {
                        // Not monitoring, show options
                        showingMonitorOptions = true
                    }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: getMainActionIcon())
                        Text(getMainActionText())
                    }
                    .font(.caption)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(getMainActionColor())
                    .cornerRadius(8)
                }
                
                // Monitor button
                Button(action: {
                    if let status = hootMonitor.getLineStatus(lineId: line.id) {
                        hootMonitor.stopMonitoring(lineId: line.id)
                    } else {
                        hootMonitor.startMonitoring(lineId: line.id, lineNumber: line.number)
                    }
                }) {
                    Image(systemName: hootMonitor.getLineStatus(lineId: line.id) != nil ? "eye.slash.fill" : "eye.fill")
                        .foregroundColor(hootMonitor.getLineStatus(lineId: line.id) != nil ? .red : .blue)
                        .padding(8)
                        .background((hootMonitor.getLineStatus(lineId: line.id) != nil ? Color.red : Color.blue).opacity(0.1))
                        .cornerRadius(8)
                }
                
                // Mute button (only when monitoring)
                if hootMonitor.getLineStatus(lineId: line.id) != nil {
                    Button(action: {
                        hootMonitor.toggleMute(lineId: line.id)
                    }) {
                        Image(systemName: hootMonitor.isLineMuted(lineId: line.id) ? "mic.slash.fill" : "mic.fill")
                            .foregroundColor(hootMonitor.isLineMuted(lineId: line.id) ? .red : .green)
                            .padding(8)
                            .background((hootMonitor.isLineMuted(lineId: line.id) ? Color.red : Color.green).opacity(0.1))
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
        .sheet(isPresented: $showingMonitorOptions) {
            HootLineMonitorOptionsSheet(line: line)
        }
    }
    
    // MARK: - Helper Methods
    
    private func getMainActionIcon() -> String {
        if let status = hootMonitor.getLineStatus(lineId: line.id) {
            return status.isMuted ? "speaker.wave.2.fill" : "speaker.slash.fill"
        } else {
            return "play.circle.fill"
        }
    }
    
    private func getMainActionText() -> String {
        if let status = hootMonitor.getLineStatus(lineId: line.id) {
            return status.isMuted ? "Unmute" : "Mute"
        } else {
            return "Join"
        }
    }
    
    private func getMainActionColor() -> Color {
        if let status = hootMonitor.getLineStatus(lineId: line.id) {
            return status.isMuted ? .green : .orange
        } else {
            return .blue
        }
    }
    
    private func toggleLine() {
        // Toggle hoot line connection
        if line.isActive {
            // Disconnect from hoot line
            linphoneManager.endCall(callId: line.id)
        } else {
            // Connect to hoot line
            linphoneManager.makeCall(to: line.number, lineType: .hoot)
        }
    }
    
    private func muteLine() {
        // Toggle mute for hoot line
        linphoneManager.muteCall(callId: line.id, muted: true)
    }
}

struct HootLineView_Previews: PreviewProvider {
    static var previews: some View {
        HootLineView(line: TradingLine(
            id: "preview",
            name: "Trading Floor",
            number: "1001",
            type: .hoot,
            status: .active,
            participants: ["Trader A", "Trader B", "Manager"]
        ))
        .environmentObject(LinphoneManager.shared)
        .padding()
        .previewLayout(.sizeThatFits)
    }
}

