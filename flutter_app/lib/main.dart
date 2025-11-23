import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';

import 'providers/linphone_provider.dart';
import 'providers/dnd_provider.dart';
import 'providers/line_manager_provider.dart';
import 'screens/trading_board_screen.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  // Initialize notification service
  await NotificationService.initialize();
  
  runApp(const DirectTraderApp());
}

class DirectTraderApp extends StatelessWidget {
  const DirectTraderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LinphoneProvider()),
        ChangeNotifierProvider(create: (_) => DNDProvider()),
        ChangeNotifierProvider(create: (_) => LineManagerProvider()),
      ],
      child: MaterialApp(
        title: 'Direct Trader Communications',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          primaryColor: const Color(0xFF1E40AF),
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF1E40AF),
            brightness: Brightness.light,
          ),
          useMaterial3: true,
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF1E40AF),
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          cardTheme: CardTheme(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E40AF),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        home: const TradingBoardScreen(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
