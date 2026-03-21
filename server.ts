import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
// Note: In production, set these in your environment variables.
const supabaseUrl = process.env.SUPABASE_URL || 'https://ncnwvmcfcslxrvsqbyxo.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbnd2bWNmY3NseHJ2c3FieXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjAxMjEsImV4cCI6MjA4OTU5NjEyMX0.20kpuSofYLl_5j-c3bG125-2ksYCHhzyfk750UoQ7hY';

/**
 * Supabase Table Schema:
 * 
 * create table inventory_data (
 *   id bigint primary key generated always as identity,
 *   data jsonb not null,
 *   meta jsonb,
 *   created_at timestamptz default now()
 * );
 * 
 * -- Enable RLS and add policies if needed, or disable RLS for testing.
 */

const supabase = createClient(supabaseUrl, supabaseKey);

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const firestore = getFirestore(firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.get("/api/inventory", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('inventory_data')
        .select('data, meta')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // If table doesn't exist, return empty data instead of 500
        if (error.code === '42P01') { 
          console.warn("Supabase table 'inventory_data' does not exist yet.");
          return res.json({ data: [], meta: null });
        }
        throw error;
      }
      
      if (!data) {
        return res.json({ data: [], meta: null });
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("Supabase load error detail:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      res.status(500).json({ error: "Failed to load data from Supabase", details: error.message });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const { data, meta } = req.body;
      
      if (!data || data.length === 0) {
        console.warn("Attempted to save empty data array.");
        return res.status(400).json({ error: "Cannot save empty data" });
      }

      console.log(`Attempting to save ${data.length} rows to Supabase...`);
      
      const { error } = await supabase
        .from('inventory_data')
        .insert([{ data, meta, created_at: new Date().toISOString() }]);

    if (error) {
      console.error("Supabase Insert Error:", error);
      // We'll continue to Firebase even if Supabase fails
    }

    // Sync to Firebase
    try {
      await firestore.collection("inventory_data").add({
        data,
        meta,
        created_at: new Date().toISOString(),
      });
      console.log("Successfully saved to Firebase.");
    } catch (firebaseError) {
      console.error("Firebase Sync Error:", firebaseError);
    }

    res.json({ success: true });
    } catch (error: any) {
      console.error("Supabase save error detail:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      res.status(500).json({ error: "Failed to save data to Supabase", details: error.message });
    }
  });

  app.delete("/api/inventory", async (req, res) => {
    try {
      // Delete all rows from the table
      const { error } = await supabase
        .from('inventory_data')
        .delete()
        .neq('id', -1); 

      if (error) throw error;
      
      // Clear Firebase
      try {
        const snapshot = await firestore.collection("inventory_data").get();
        const batch = firestore.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log("Successfully cleared Firebase.");
      } catch (firebaseError) {
        console.error("Firebase Clear Error:", firebaseError);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Supabase clear error:", error);
      res.status(500).json({ error: "Failed to clear data from Supabase" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not on Vercel or Netlify
  if (process.env.NODE_ENV !== "production" || (!process.env.VERCEL && !process.env.NETLIFY)) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

// For Vercel, we export the app instance. 
// Since startServer is async, we handle it carefully.
const app = await startServer();
export default app;
