const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = express.Router();

// POST /api/players/upload-avatar
// Expects multipart/form-data with fields: image (file), playerId
// Response: { imageUrl }
router.post('/api/players/upload-avatar', upload.single('image'), async (req, res) => {
  try {
    const { playerId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!playerId) return res.status(400).json({ error: 'Missing playerId' });

    // If AWS S3 is configured, you can upload here. Otherwise we'll save to ./public/uploads/players/<playerId>/
    const useS3 = !!process.env.S3_BUCKET; // boolean toggle

    let publicUrl;

    if (useS3) {
      // Example: Use @aws-sdk/client-s3 to upload. Make sure to `npm install @aws-sdk/client-s3`
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3 = new S3Client({ region: process.env.AWS_REGION });
      const key = `players/${playerId}/avatar-${Date.now()}${path.extname(file.originalname)}`;
      const params = {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      await s3.send(new PutObjectCommand(params));
      publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } else {
      // local fallback: save to public/uploads
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'players', String(playerId));
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const filename = `avatar-${Date.now()}${path.extname(file.originalname)}`;
      const filepath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filepath, file.buffer);
      // If your server serves /public as root, this URL should be accessible
      publicUrl = `/uploads/players/${playerId}/${filename}`;
    }

    // Try to persist avatarUrl in the DB. Attempt several common ORMs/clients.
    let persisted = false;
    const attempts = [];

    // 1) Prisma
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      // Try numeric id first, fallback to string
      const whereId = isNaN(Number(playerId)) ? playerId : Number(playerId);
      await prisma.player.update({ where: { id: whereId }, data: { avatarUrl: publicUrl } });
      persisted = true;
      attempts.push('prisma');
    } catch (e) {
      // ignore
    }

    // 2) Sequelize (common pattern: require('../models') -> { Player }
    if (!persisted) {
      try {
        const models = require('../models');
        if (models && models.Player && typeof models.Player.update === 'function') {
          await models.Player.update({ avatarUrl: publicUrl }, { where: { id: playerId } });
          persisted = true;
          attempts.push('sequelize');
        }
      } catch (e) {
        // ignore
      }
    }

    // 3) Knex / direct DB module
    if (!persisted) {
      try {
        const db = require('../db');
        // If db is a knex instance
        if (typeof db === 'function' || db && typeof db.select === 'function') {
          await db('players').where('id', playerId).update({ avatarUrl: publicUrl });
          persisted = true;
          attempts.push('knex');
        } else if (db && db.players && typeof db.players.update === 'function') {
          await db.players.update({ id: playerId }, { avatarUrl: publicUrl });
          persisted = true;
          attempts.push('db.players.update');
        }
      } catch (e) {
        // ignore
      }
    }

    // 4) Try a players model in common paths
    if (!persisted) {
      const possiblePaths = ['../models/player', '../models/Player', '../lib/models/player', '../../models/player'];
      for (const p of possiblePaths) {
        try {
          const playerModel = require(p);
          if (playerModel) {
            if (typeof playerModel.update === 'function') {
              await playerModel.update(playerId, { avatarUrl: publicUrl });
              persisted = true;
              attempts.push(p);
              break;
            }
            if (typeof playerModel.save === 'function') {
              await playerModel.save({ id: playerId, avatarUrl: publicUrl });
              persisted = true;
              attempts.push(p + '.save');
              break;
            }
            if (typeof playerModel.updateById === 'function') {
              await playerModel.updateById(playerId, { avatarUrl: publicUrl });
              persisted = true;
              attempts.push(p + '.updateById');
              break;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (!persisted) {
      console.warn('players-upload: Could not automatically persist avatarUrl to DB. Tried:', attempts);
    }

    return res.json({ imageUrl: publicUrl, persisted });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).json({ error: 'upload_failed' });
  }
});

module.exports = router;
