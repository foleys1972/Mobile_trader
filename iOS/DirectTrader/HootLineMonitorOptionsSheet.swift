import SwiftUI

struct HootLineMonitorOptionsSheet: View {
    let line: TradingLine
    @Environment(\.presentationMode) var presentationMode
    @StateObject private var hootMonitor = HootLineMonitor.shared
    @State private var selectedOption: MonitorOption = .monitorMuted
    
    enum MonitorOption: String, CaseIterable {
        case joinActive = "join_active"
        case monitorMuted = "monitor_muted"
        case monitorWithNotifications = "monitor_notifications"
        
        var title: String {
            switch self {
            case .joinActive:
                return "Join Active"
            case .monitorMuted:
                return "Monitor (Muted)"
            case .monitorWithNotifications:
                return "Monitor with Notifications"
            }
        }
        
        var description: String {
            switch self {
            case .joinActive:
                return "Join the hoot line and participate in conversations"
            case .monitorMuted:
                return "Monitor the line without audio - you can see activity but won't hear anything"
            case .monitorWithNotifications:
                return "Monitor silently and get notifications when someone speaks"
            }
        }
        
        var icon: String {
            switch self {
            case .joinActive:
                return "speaker.wave.2.fill"
            case .monitorMuted:
                return "speaker.slash.fill"
            case .monitorWithNotifications:
                return "bell.fill"
            }
        }
        
        var color: Color {
            switch self {
            case .joinActive:
                return .green
            case .monitorMuted:
                return .orange
            case .monitorWithNotifications:
                return .blue
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "phone.fill")
                        .font(.system(size: 48))
                        .foregroundColor(.blue)
                    
                    Text("Join \(line.name)")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Choose how you want to connect to this hoot line")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 20)
                
                // Options
                VStack(spacing: 16) {
                    ForEach(MonitorOption.allCases, id: \.self) { option in
                        MonitorOptionCard(
                            option: option,
                            isSelected: selectedOption == option,
                            onTap: {
                                selectedOption = option
                            }
                        )
                    }
                }
                
                Spacer()
                
                // Action Buttons
                VStack(spacing: 12) {
                    Button(action: {
                        handleOptionSelection()
                    }) {
                        HStack {
                            Image(systemName: selectedOption.icon)
                            Text("Connect")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(selectedOption.color)
                        .cornerRadius(12)
                    }
                    
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.secondary)
                }
            }
            .padding()
            .navigationTitle("Hoot Line Options")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Cancel") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
    
    private func handleOptionSelection() {
        switch selectedOption {
        case .joinActive:
            // Join the hoot line normally
            hootMonitor.startMonitoring(lineId: line.id, lineNumber: line.number)
            // Immediately unmute to join the conversation
            hootMonitor.toggleMute(lineId: line.id)
            
        case .monitorMuted:
            // Start monitoring in muted mode
            hootMonitor.startMonitoring(lineId: line.id, lineNumber: line.number)
            // Ensure it's muted
            if !hootMonitor.isLineMuted(lineId: line.id) {
                hootMonitor.toggleMute(lineId: line.id)
            }
            
        case .monitorWithNotifications:
            // Start monitoring with notifications enabled
            hootMonitor.startMonitoring(lineId: line.id, lineNumber: line.number)
            // Ensure it's muted for notifications
            if !hootMonitor.isLineMuted(lineId: line.id) {
                hootMonitor.toggleMute(lineId: line.id)
            }
        }
        
        presentationMode.wrappedValue.dismiss()
    }
}

struct MonitorOptionCard: View {
    let option: HootLineMonitorOptionsSheet.MonitorOption
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // Icon
                Image(systemName: option.icon)
                    .font(.title2)
                    .foregroundColor(option.color)
                    .frame(width: 32, height: 32)
                
                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(option.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(option.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.leading)
                }
                
                Spacer()
                
                // Selection indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(isSelected ? option.color : .gray)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? option.color.opacity(0.1) : Color(.systemBackground))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? option.color : Color(.systemGray4), lineWidth: isSelected ? 2 : 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct HootLineMonitorOptionsSheet_Previews: PreviewProvider {
    static var previews: some View {
        HootLineMonitorOptionsSheet(line: TradingLine(
            id: "preview",
            name: "Trading Floor",
            number: "1001",
            type: .hoot,
            status: .active,
            participants: []
        ))
    }
}
