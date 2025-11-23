import Foundation
import SwiftUI

class LineManager: ObservableObject {
    @Published var hootLines: [TradingLine] = []
    @Published var ardLines: [TradingLine] = []
    @Published var mrdLines: [TradingLine] = []
    
    init() {
        loadDefaultConfiguration()
    }
    
    func loadConfiguration() {
        // Load configuration from server or local storage
        // This would typically fetch from a backend API
        loadDefaultConfiguration()
    }
    
    private func loadDefaultConfiguration() {
        // Default trading lines for demonstration
        hootLines = [
            TradingLine(
                id: "hoot-1",
                name: "Trading Floor",
                number: "1001",
                type: .hoot,
                status: .active,
                participants: ["Trader A", "Trader B", "Manager"]
            ),
            TradingLine(
                id: "hoot-2", 
                name: "Risk Management",
                number: "1002",
                type: .hoot,
                status: .active,
                participants: ["Risk Officer", "Compliance"]
            ),
            TradingLine(
                id: "hoot-3",
                name: "Back Office",
                number: "1003", 
                type: .hoot,
                status: .inactive,
                participants: ["Operations", "Settlement"]
            )
        ]
        
        ardLines = [
            TradingLine(
                id: "ard-1",
                name: "Emergency Line",
                number: "2001",
                type: .ard,
                status: .ready,
                participants: []
            ),
            TradingLine(
                id: "ard-2",
                name: "Compliance Hotline", 
                number: "2002",
                type: .ard,
                status: .ready,
                participants: []
            ),
            TradingLine(
                id: "ard-3",
                name: "IT Support",
                number: "2003",
                type: .ard,
                status: .ready,
                participants: []
            )
        ]
        
        mrdLines = [
            TradingLine(
                id: "mrd-1",
                name: "Client A",
                number: "3001",
                type: .mrd,
                status: .ready,
                participants: []
            ),
            TradingLine(
                id: "mrd-2",
                name: "Client B",
                number: "3002", 
                type: .mrd,
                status: .ready,
                participants: []
            ),
            TradingLine(
                id: "mrd-3",
                name: "Broker C",
                number: "3003",
                type: .mrd,
                status: .ready,
                participants: []
            ),
            TradingLine(
                id: "mrd-4",
                name: "Market Data",
                number: "3004",
                type: .mrd,
                status: .ready,
                participants: []
            )
        ]
    }
    
    func updateLineStatus(_ lineId: String, status: LineStatus) {
        if let index = hootLines.firstIndex(where: { $0.id == lineId }) {
            hootLines[index].status = status
        } else if let index = ardLines.firstIndex(where: { $0.id == lineId }) {
            ardLines[index].status = status
        } else if let index = mrdLines.firstIndex(where: { $0.id == lineId }) {
            mrdLines[index].status = status
        }
    }
    
    func addParticipant(to lineId: String, participant: String) {
        if let index = hootLines.firstIndex(where: { $0.id == lineId }) {
            hootLines[index].participants.append(participant)
        }
    }
    
    func removeParticipant(from lineId: String, participant: String) {
        if let index = hootLines.firstIndex(where: { $0.id == lineId }) {
            hootLines[index].participants.removeAll { $0 == participant }
        }
    }
}

// MARK: - Data Models

struct TradingLine: Identifiable {
    let id: String
    let name: String
    let number: String
    let type: LineType
    var status: LineStatus
    var participants: [String]
    
    var isActive: Bool {
        return status == .active
    }
    
    var statusColor: Color {
        switch status {
        case .active:
            return .green
        case .inactive:
            return .gray
        case .ready:
            return .blue
        case .busy:
            return .orange
        case .error:
            return .red
        }
    }
    
    var statusText: String {
        switch status {
        case .active:
            return "Active"
        case .inactive:
            return "Inactive"
        case .ready:
            return "Ready"
        case .busy:
            return "Busy"
        case .error:
            return "Error"
        }
    }
}

enum LineStatus {
    case active
    case inactive
    case ready
    case busy
    case error
}

