import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/linphone_provider.dart';

/// Connection status bar widget
class ConnectionStatusBar extends StatelessWidget {
  const ConnectionStatusBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<LinphoneProvider>(
      builder: (context, provider, child) {
        final isConnected = provider.isConnected;
        final status = provider.connectionStatus;
        
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: isConnected ? Colors.green.shade100 : Colors.red.shade100,
          child: Row(
            children: [
              Icon(
                isConnected ? Icons.check_circle : Icons.error,
                color: isConnected ? Colors.green : Colors.red,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                status,
                style: TextStyle(
                  color: isConnected ? Colors.green.shade900 : Colors.red.shade900,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

