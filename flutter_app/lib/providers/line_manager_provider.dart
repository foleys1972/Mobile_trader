import 'package:flutter/foundation.dart';
import '../models/trading_line.dart';
import '../models/line_type.dart';

/// Line Manager Provider - Manages trading lines configuration
class LineManagerProvider extends ChangeNotifier {
  List<TradingLine> _hootLines = [];
  List<TradingLine> _ardLines = [];
  List<TradingLine> _mrdLines = [];
  
  List<TradingLine> get hootLines => List.unmodifiable(_hootLines);
  List<TradingLine> get ardLines => List.unmodifiable(_ardLines);
  List<TradingLine> get mrdLines => List.unmodifiable(_mrdLines);
  
  /// Load configuration from API or local storage
  Future<void> loadConfiguration() async {
    // TODO: Load from API or local storage
    // For now, use mock data
    _hootLines = [
      TradingLine(
        id: 'hoot_1',
        name: 'Hoot Line 1',
        number: '+1234567890',
        type: LineType.hoot,
        status: LineStatus.ready,
      ),
    ];
    
    _ardLines = [
      TradingLine(
        id: 'ard_1',
        name: 'ARD Line 1',
        number: '+1234567891',
        type: LineType.ard,
        status: LineStatus.ready,
      ),
    ];
    
    _mrdLines = [
      TradingLine(
        id: 'mrd_1',
        name: 'MRD Line 1',
        number: '+1234567892',
        type: LineType.mrd,
        status: LineStatus.ready,
      ),
    ];
    
    notifyListeners();
  }
  
  /// Update line status
  void updateLineStatus(String lineId, LineStatus status) {
    _updateLineInList(_hootLines, lineId, status);
    _updateLineInList(_ardLines, lineId, status);
    _updateLineInList(_mrdLines, lineId, status);
    notifyListeners();
  }
  
  void _updateLineInList(List<TradingLine> lines, String lineId, LineStatus status) {
    final index = lines.indexWhere((line) => line.id == lineId);
    if (index != -1) {
      lines[index] = lines[index].copyWith(status: status);
    }
  }
}

