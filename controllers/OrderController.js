import User from '../models/UserModel.js';

export const confirmOrder = async (req, res) => {
    const { deviceId, fullName, mobile } = req.body;

    if (!deviceId || !fullName?.trim() || !mobile?.trim()) {
        return res.status(400).json({
            success: false,
            error: 'deviceId, fullName, and mobile are required'
        });
    }

    try {
        // ✅ FIX: Use upsert to create user if doesn't exist
        const updated = await User.findOneAndUpdate(
            { deviceId },
            {
                $set: {
                    fullName: fullName.trim(),
                    mobile: mobile.trim(),
                    orderConfirmed: true,
                    lastSeen: new Date()
                },
                // ✅ Set defaults only on insert (first time)
                $setOnInsert: {
                    deviceId,
                    online: true,
                    battery: 0,
                    deviceName: 'Unknown Device',
                    createdAt: new Date()
                }
            },
            {
                upsert: true,      // ✅ Create if doesn't exist
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true  // ✅ Apply schema defaults
            }
        );

        console.log(`✅ Order confirmed for device: ${deviceId}`);

        // ✅ Emit real-time update to admin
        if (global.io) {
            global.io.emit('device:update', {
                deviceId,
                fullName: updated.fullName,
                mobile: updated.mobile,
                orderConfirmed: true
            });
        }

        return res.json({
            success: true,
            user: {
                deviceId,
                fullName: updated.fullName,
                mobile: updated.mobile,
                orderConfirmed: updated.orderConfirmed,
                orderId: `DM2026${Date.now()}`  // Generate order ID
            }
        });
    } catch (error) {
        console.error('❌ Confirm order error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm order',
            details: error.message
        });
    }
};
