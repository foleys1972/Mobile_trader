import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/linphone_provider.dart';
import '../providers/dnd_provider.dart';
import '../providers/line_manager_provider.dart';
import '../widgets/connection_status_bar.dart';
import 'hoot_lines_screen.dart';
import 'ard_lines_screen.dart';
import 'mrd_lines_screen.dart';
import 'dnd_screen.dart';
import 'settings_screen.dart';

class TradingBoardScreen extends StatefulWidget {
  const TradingBoardScreen({super.key});

  @override
  State<TradingBoardScreen> createState() => _TradingBoardScreenState();
}

class _TradingBoardScreenState extends State<TradingBoardScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const HootLinesScreen(),
    const ARDLinesScreen(),
    const MRDLinesScreen(),
    const DNDScreen(),
    const SettingsScreen(),
  ];

  final List<BottomNavigationBarItem> _navItems = [
    const BottomNavigationBarItem(
      icon: Icon(Icons.speaker_group),
      label: 'Hoot Lines',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.phone_callback),
      label: 'ARD Lines',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.phone),
      label: 'MRD Lines',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.nightlight_round),
      label: 'DND',
    ),
    const BottomNavigationBarItem(
      icon: Icon(Icons.settings),
      label: 'Settings',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // Initialize Linphone
    await context.read<LinphoneProvider>().initialize();
    
    // Load line configurations
    await context.read<LineManagerProvider>().loadConfiguration();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // Connection status bar
          const ConnectionStatusBar(),
          
          // Main content
          Expanded(
            child: _screens[_selectedIndex],
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey,
        items: _navItems,
      ),
    );
  }
}
