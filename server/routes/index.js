const express = require('express');
const router = express.Router();
const recordingRoutes = require('./recordingRoutes');
const webrtcRoutes = require('./webrtcRoutes');
const groupRoutes = require('./groupRoutes');
const matrixRoutes = require('./matrixRoutes');
const complianceRoutes = require('./complianceRoutes');
const federationRoutes = require('./federationRoutes');
const { router: authRoutes } = require('./authRoutes');

// Mount recording routes
router.use('/recordings', recordingRoutes);

// Mount WebRTC routes
router.use('/webrtc', webrtcRoutes);

// Mount group routes
router.use('/groups', groupRoutes);

// Mount Matrix routes
router.use('/matrix', matrixRoutes);

// Mount compliance routes
router.use('/compliance', complianceRoutes);

// Mount federation routes
router.use('/federation', federationRoutes);

// Mount auth routes
router.use('/auth', authRoutes);

module.exports = router;
