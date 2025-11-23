import SwiftUI

struct DNDView: View {
    @StateObject private var dndManager = DNDManager.shared
    @State private var showingScheduledSettings = false
    @State private var showingAllowedCallers = false
    @State private var newCallerAddress = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // DND Status Card
                DNDStatusCard()
                
                // Quick Actions
                DNDQuickActions()
                
                // Settings Sections
                DNDSettingsSection()
                
                Spacer()
            }
            .padding()
            .navigationTitle("Do Not Disturb")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingScheduledSettings) {
                ScheduledDNSSheet()
            }
            .sheet(isPresented: $showingAllowedCallers) {
                AllowedCallersSheet()
            }
        }
    }
}

struct DNDStatusCard: View {
    @StateObject private var dndManager = DNDManager.shared
    
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Do Not Disturb")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text(dndManager.isDNDEnabled ? "Active - Calls Blocked" : "Inactive - Calls Allowed")
                        .font(.subheadline)
                        .foregroundColor(dndManager.isDNDEnabled ? .red : .green)
                }
                
                Spacer()
                
                // DND Toggle
                Toggle("", isOn: $dndManager.isDNDEnabled)
                    .toggleStyle(SwitchToggleStyle(tint: .red))
                    .scaleEffect(1.2)
                    .onChange(of: dndManager.isDNDEnabled) { _ in
                        dndManager.toggleDND()
                    }
            }
            
            // Status indicator
            HStack {
                Circle()
                    .fill(dndManager.isDNDEnabled ? .red : .green)
                    .frame(width: 12, height: 12)
                
                Text(dndManager.isDNDEnabled ? "Blocking incoming calls" : "Allowing all calls")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

struct DNDQuickActions: View {
    @StateObject private var dndManager = DNDManager.shared
    @State private var showingScheduledSettings = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack(spacing: 12) {
                // Emergency Override Toggle
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.title2)
                    
                    Text("Emergency Override")
                        .font(.caption)
                        .multilineTextAlignment(.center)
                    
                    Toggle("", isOn: $dndManager.emergencyOverride)
                        .toggleStyle(SwitchToggleStyle(tint: .orange))
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
                
                // Schedule DND Button
                VStack(spacing: 8) {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.blue)
                        .font(.title2)
                    
                    Text("Schedule DND")
                        .font(.caption)
                        .multilineTextAlignment(.center)
                    
                    Button(action: {
                        showingScheduledSettings = true
                    }) {
                        Text("Set Schedule")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
            }
        }
    }
}

struct DNDSettingsSection: View {
    @StateObject private var dndManager = DNDManager.shared
    @State private var showingAllowedCallers = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Settings")
                .font(.headline)
                .foregroundColor(.primary)
            
            VStack(spacing: 12) {
                // DND Mode Selection
                HStack {
                    Text("DND Mode")
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Picker("DND Mode", selection: $dndManager.dndMode) {
                        ForEach(DNDMode.allCases, id: \.self) { mode in
                            Text(mode.displayName).tag(mode)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .frame(width: 200)
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
                
                // Allowed Callers
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Allowed Callers")
                            .foregroundColor(.primary)
                        
                        Text("\(dndManager.allowedCallers.count) callers allowed")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        showingAllowedCallers = true
                    }) {
                        HStack(spacing: 4) {
                            Text("Manage")
                                .font(.caption)
                            Image(systemName: "chevron.right")
                                .font(.caption2)
                        }
                        .foregroundColor(.blue)
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
                
                // Scheduled DND Info
                if dndManager.dndMode == .scheduled,
                   let start = dndManager.scheduledDNDStart,
                   let end = dndManager.scheduledDNDEnd {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Scheduled DND")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                        
                        HStack {
                            Text("Start: \(start, formatter: timeFormatter)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Spacer()
                            
                            Text("End: \(end, formatter: timeFormatter)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Button("Cancel Schedule") {
                            dndManager.cancelScheduledDND()
                        }
                        .font(.caption)
                        .foregroundColor(.red)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
                }
            }
        }
    }
    
    private var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }
}

struct ScheduledDNSSheet: View {
    @Environment(\.presentationMode) var presentationMode
    @StateObject private var dndManager = DNDManager.shared
    @State private var startTime = Date()
    @State private var endTime = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Schedule Do Not Disturb")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Set specific times when DND should be automatically enabled and disabled.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                VStack(spacing: 20) {
                    // Start Time
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Start Time")
                            .font(.headline)
                        
                        DatePicker("Start Time", selection: $startTime, displayedComponents: .hourAndMinute)
                            .datePickerStyle(WheelDatePickerStyle())
                    }
                    
                    // End Time
                    VStack(alignment: .leading, spacing: 8) {
                        Text("End Time")
                            .font(.headline)
                        
                        DatePicker("End Time", selection: $endTime, displayedComponents: .hourAndMinute)
                            .datePickerStyle(WheelDatePickerStyle())
                    }
                }
                
                Spacer()
                
                // Action Buttons
                HStack(spacing: 16) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    Button("Set Schedule") {
                        dndManager.setScheduledDND(start: startTime, end: endTime)
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                }
            }
            .padding()
            .navigationTitle("Schedule DND")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
}

struct AllowedCallersSheet: View {
    @Environment(\.presentationMode) var presentationMode
    @StateObject private var dndManager = DNDManager.shared
    @State private var newCallerAddress = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Add New Caller
                VStack(alignment: .leading, spacing: 12) {
                    Text("Add Allowed Caller")
                        .font(.headline)
                    
                    HStack {
                        TextField("Phone number or SIP address", text: $newCallerAddress)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                        
                        Button("Add") {
                            if !newCallerAddress.isEmpty {
                                dndManager.addAllowedCaller(newCallerAddress)
                                newCallerAddress = ""
                            }
                        }
                        .disabled(newCallerAddress.isEmpty)
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
                
                // Allowed Callers List
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Allowed Callers")
                            .font(.headline)
                        
                        Spacer()
                        
                        if !dndManager.allowedCallers.isEmpty {
                            Button("Clear All") {
                                dndManager.clearAllowedCallers()
                            }
                            .font(.caption)
                            .foregroundColor(.red)
                        }
                    }
                    
                    if dndManager.allowedCallers.isEmpty {
                        Text("No allowed callers. All calls will be blocked when DND is enabled.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    } else {
                        ForEach(dndManager.allowedCallers, id: \.self) { caller in
                            HStack {
                                Image(systemName: "person.circle.fill")
                                    .foregroundColor(.green)
                                
                                Text(caller)
                                    .font(.subheadline)
                                
                                Spacer()
                                
                                Button(action: {
                                    dndManager.removeAllowedCaller(caller)
                                }) {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundColor(.red)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
                
                Spacer()
            }
            .padding()
            .navigationTitle("Allowed Callers")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
}

struct DNDView_Previews: PreviewProvider {
    static var previews: some View {
        DNDView()
    }
}
