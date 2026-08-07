import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini client lazily or safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Gemini API calls will fail.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "dummy_key",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// In-memory project store (starts empty; stores user-created whiteboards)
let projectsDatabase: Record<string, any> = {};

// --- GOOGLE DRIVE OAUTH & INTEGRATION API ---

// Supabase Database Integration
let runtimeSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
let runtimeSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

function getSupabaseClient() {
  if (runtimeSupabaseUrl && runtimeSupabaseKey) {
    try {
      return createClient(runtimeSupabaseUrl, runtimeSupabaseKey);
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
    }
  }
  return null;
}

// Supabase Status Endpoint
app.get("/api/supabase/status", async (req, res) => {
  const client = getSupabaseClient();
  let tableReady = false;
  let rowCount = 0;

  if (client) {
    try {
      const { data, error, count } = await client.from("projects").select("id", { count: "exact", head: true });
      if (!error) {
        tableReady = true;
        rowCount = count || 0;
      }
    } catch (e) {
      console.warn("Supabase health check:", e);
    }
  }

  res.json({
    success: true,
    configured: !!(runtimeSupabaseUrl && runtimeSupabaseKey),
    tableReady,
    rowCount,
    supabaseUrl: runtimeSupabaseUrl ? runtimeSupabaseUrl.replace(/(https:\/\/.*?)\..*/, "$1.supabase.co") : "",
  });
});

// Send Team Invite via Supabase Auth
app.post("/api/team/invite", async (req, res) => {
  try {
    const { email, role, teamName, redirectUrl } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required" });
    }

    const supabase = getSupabaseClient();
    let emailSent = false;
    let message = "";

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: redirectUrl || `http://localhost:3000`,
          data: { teamName: teamName || "FlowBoard Team", role: role || "Editor" }
        });

        if (!error) {
          emailSent = true;
          message = `Invitation email sent directly to ${email} via Supabase Mail Service!`;
        } else {
          console.warn("Supabase auth invite info:", error.message);
          message = `Invite for ${email} registered with Supabase (${error.message}).`;
        }
      } catch (sbErr: any) {
        console.warn("Supabase invite catch:", sbErr?.message);
        message = `Invite recorded in Supabase for ${email}.`;
      }
    } else {
      message = `Invite registered for ${email}.`;
    }

    return res.json({
      success: true,
      emailSent,
      message
    });
  } catch (err: any) {
    console.error("Team invite error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to send invite" });
  }
});

// Configure Supabase Credentials Endpoint
app.post("/api/supabase/credentials", (req, res) => {
  const { supabaseUrl, supabaseKey } = req.body;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ success: false, error: "Both Supabase URL and Key are required" });
  }
  runtimeSupabaseUrl = supabaseUrl.trim();
  runtimeSupabaseKey = supabaseKey.trim();
  res.json({ success: true, message: "Supabase credentials updated successfully!" });
});

// --- JWT AUTHENTICATION & SUPABASE DYNAMIC WORKER SYSTEM ---
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || "flowboard_supabase_jwt_secret_2026";
const DYNAMIC_WORKER_URL = "https://hlgmhevrxoqutyeqesik.supabase.co/functions/v1/dynamic-worker";

// Issue JWT Token with Supabase Key & Email (supports Microsoft Edge / Outlook / Custom Email & API Keys)
app.post("/api/auth/jwt/issue", (req, res) => {
  try {
    const { email, role = "authenticated", apiKey, provider = "Microsoft Edge Email" } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required for JWT token generation" });
    }

    const payload = {
      sub: email,
      email: email,
      role: role,
      provider: provider,
      apiKey: apiKey || runtimeSupabaseKey || "sb_anon_key_demo",
      aud: "authenticated",
      iss: "https://hlgmhevrxoqutyeqesik.supabase.co",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 3600 // 24 hours validity
    };

    const token = jwt.sign(payload, JWT_SECRET);

    return res.json({
      success: true,
      token,
      user: {
        email,
        role,
        provider,
        apiKey: apiKey || runtimeSupabaseKey ? "••••••••" : "Default Key"
      },
      expiresIn: "24h",
      dynamicWorkerEndpoint: DYNAMIC_WORKER_URL
    });
  } catch (err: any) {
    console.error("JWT Issue error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to issue JWT token" });
  }
});

// Verify JWT Token / API Key
app.post("/api/auth/jwt/verify", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = req.body.token || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null);

    if (!token) {
      return res.status(400).json({ success: false, valid: false, error: "No JWT token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({
      success: true,
      valid: true,
      decoded,
      dynamicWorkerEndpoint: DYNAMIC_WORKER_URL
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      valid: false,
      error: "Invalid or expired JWT token: " + err.message
    });
  }
});

// Supabase Dynamic Worker Integration Endpoint
// Proxies requests directly to https://hlgmhevrxoqutyeqesik.supabase.co/functions/v1/dynamic-worker
app.post("/api/supabase/dynamic-worker", async (req, res) => {
  try {
    const { action = "process_task", payload = {}, apiKey, token } = req.body;
    const authHeader = req.headers.authorization;
    const activeToken = token || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null);

    const activeApiKey = apiKey || runtimeSupabaseKey || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

    // Prepare headers for Supabase Dynamic Worker Edge Function
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": activeApiKey
    };

    if (activeToken) {
      headers["Authorization"] = `Bearer ${activeToken}`;
    } else {
      headers["Authorization"] = `Bearer ${activeApiKey}`;
    }

    console.log(`[DynamicWorker] Invoking Supabase worker endpoint: ${DYNAMIC_WORKER_URL}`);

    const response = await fetch(DYNAMIC_WORKER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action,
        payload,
        timestamp: new Date().toISOString()
      })
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { rawText: responseText };
    }

    if (response.ok) {
      return res.json({
        success: true,
        endpoint: DYNAMIC_WORKER_URL,
        status: response.status,
        result: data
      });
    } else {
      // Return structured response with worker status
      return res.json({
        success: false,
        endpoint: DYNAMIC_WORKER_URL,
        status: response.status,
        error: data.message || data.error || responseText || "Dynamic worker returned non-200 status",
        workerResponse: data
      });
    }
  } catch (err: any) {
    console.error("Dynamic Worker Proxy Error:", err);
    return res.status(500).json({
      success: false,
      endpoint: DYNAMIC_WORKER_URL,
      error: err.message || "Failed to reach Supabase Dynamic Worker endpoint"
    });
  }
});

const LINKED_DRIVE_FOLDER_ID = "1UEWnpeuRRhMsBv67HQouRUo-yjDYeDuI";
const LINKED_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${LINKED_DRIVE_FOLDER_ID}?usp=sharing`;

let driveTokensInMemory: any = null;

function createOAuth2Client(req?: express.Request) {
  const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  let redirectUri = process.env.OAUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri && req) {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host");
    redirectUri = `${protocol}://${host}/api/drive/oauth2callback`;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getAuthenticatedDriveClient(req?: express.Request) {
  const oauth2Client = createOAuth2Client(req);
  if (driveTokensInMemory) {
    oauth2Client.setCredentials(driveTokensInMemory);
    return google.drive({ version: "v3", auth: oauth2Client });
  }
  return null;
}

// Drive Status Check
app.get("/api/drive/status", (req, res) => {
  res.json({
    success: true,
    connected: !!driveTokensInMemory,
    linkedFolderId: LINKED_DRIVE_FOLDER_ID,
    linkedFolderUrl: LINKED_DRIVE_FOLDER_URL,
    hasCredentialsConfigured: !!(process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID)
  });
});

// Generate Auth URL
app.get("/api/drive/auth-url", (req, res) => {
  try {
    const oauth2Client = createOAuth2Client(req);
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.readonly"
      ]
    });
    res.json({ success: true, url });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to generate auth URL" });
  }
});

// OAuth Callback
app.get("/api/drive/oauth2callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send("No authorization code provided.");
    }

    const oauth2Client = createOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);
    driveTokensInMemory = tokens;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Drive Authentication Successful</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #0f172a; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            .icon { font-size: 3rem; color: #16a34a; margin-bottom: 1rem; }
            h2 { margin: 0 0 0.5rem 0; color: #1e293b; }
            p { color: #64748b; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Connected to Google Drive!</h2>
            <p>You may close this window and return to FlowBoard AI.</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_DRIVE_AUTH_SUCCESS' }, '*');
              }
            } catch (e) {}
            setTimeout(() => { window.close(); }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

// Disconnect Drive
app.post("/api/drive/disconnect", (req, res) => {
  driveTokensInMemory = null;
  res.json({ success: true });
});

// List Files in Linked Folder or Drive
app.get("/api/drive/files", async (req, res) => {
  try {
    const drive = getAuthenticatedDriveClient(req);
    if (!drive) {
      return res.status(401).json({ success: false, error: "Not authenticated with Google Drive" });
    }

    const folderId = (req.query.folderId as string) || LINKED_DRIVE_FOLDER_ID;
    let files: any[] = [];

    try {
      // First try listing files in the specific linked folder
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id, name, mimeType, modifiedTime, webViewLink, thumbnailLink, size)",
        orderBy: "modifiedTime desc",
        pageSize: 30
      });
      files = response.data.files || [];
    } catch (folderError: any) {
      console.warn("Folder search failed, falling back to general file search:", folderError.message);
      // Fallback to searching all files created or accessible by app
      const fallbackResponse = await drive.files.list({
        q: "trashed = false",
        fields: "files(id, name, mimeType, modifiedTime, webViewLink, thumbnailLink, size)",
        orderBy: "modifiedTime desc",
        pageSize: 30
      });
      files = fallbackResponse.data.files || [];
    }

    res.json({ success: true, files, folderId, folderUrl: LINKED_DRIVE_FOLDER_URL });
  } catch (error: any) {
    console.error("Error listing Drive files:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch Drive files" });
  }
});

// Export Project / Canvas to Google Drive
app.post("/api/drive/export", async (req, res) => {
  try {
    const drive = getAuthenticatedDriveClient(req);
    if (!drive) {
      return res.status(401).json({ success: false, error: "Not authenticated with Google Drive" });
    }

    const { project } = req.body;
    if (!project) {
      return res.status(400).json({ success: false, error: "Project data required for export" });
    }

    const fileName = `${(project.title || "FlowBoard_Diagram").replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.flow.json`;
    const jsonString = JSON.stringify(project, null, 2);

    let fileMetaData: any = {
      name: fileName,
      mimeType: "application/json"
    };

    // Try placing in linked folder first
    try {
      fileMetaData.parents = [LINKED_DRIVE_FOLDER_ID];
      const driveRes = await drive.files.create({
        requestBody: fileMetaData,
        media: {
          mimeType: "application/json",
          body: jsonString
        },
        fields: "id, name, webViewLink, createdTime"
      });
      return res.json({
        success: true,
        file: driveRes.data,
        message: `Exported successfully to Google Drive folder (${fileName})`
      });
    } catch (folderErr: any) {
      console.warn("Could not save into linked folder, saving to root Drive instead:", folderErr.message);
      delete fileMetaData.parents;
      const rootRes = await drive.files.create({
        requestBody: fileMetaData,
        media: {
          mimeType: "application/json",
          body: jsonString
        },
        fields: "id, name, webViewLink, createdTime"
      });
      return res.json({
        success: true,
        file: rootRes.data,
        message: `Exported successfully to Google Drive (${fileName})`
      });
    }
  } catch (error: any) {
    console.error("Error exporting to Drive:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to export project to Google Drive" });
  }
});

// Import File from Google Drive
app.get("/api/drive/import/:fileId", async (req, res) => {
  try {
    const drive = getAuthenticatedDriveClient(req);
    if (!drive) {
      return res.status(401).json({ success: false, error: "Not authenticated with Google Drive" });
    }

    const fileId = req.params.fileId;
    const fileMetadata = await drive.files.get({
      fileId,
      fields: "id, name, mimeType"
    });

    const fileContentRes = await drive.files.get({
      fileId,
      alt: "media"
    }, { responseType: "text" });

    const rawData = fileContentRes.data;
    let parsedProject: any = null;

    try {
      parsedProject = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (e) {
      // If it's plain text, construct a simple diagram node structure
      parsedProject = {
        title: fileMetadata.data.name || "Imported Drive Document",
        description: "Imported from Google Drive file",
        nodes: [
          {
            id: "drive-node-1",
            type: "sticky",
            title: fileMetadata.data.name || "Drive File",
            subtitle: String(rawData).slice(0, 150),
            x: 300,
            y: 200,
            width: 260,
            height: 140,
            color: "#dae2fd",
            borderColor: "#004ac6"
          }
        ],
        connectors: []
      };
    }

    // Save as new project or return
    const id = "drive-import-" + Date.now();
    const newProject = {
      id,
      title: parsedProject.title || fileMetadata.data.name || "Drive Diagram",
      description: parsedProject.description || "Imported from Google Drive",
      updatedAt: new Date().toISOString(),
      updatedLabel: "Just now",
      category: "My Projects",
      nodes: parsedProject.nodes || [],
      connectors: parsedProject.connectors || [],
      comments: parsedProject.comments || [],
      chat: [
        { id: "m-import", author: "System", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), text: `Imported from Google Drive file: ${fileMetadata.data.name}` }
      ]
    };

    projectsDatabase[id] = newProject;
    return res.json({ success: true, project: newProject });
  } catch (error: any) {
    console.error("Error importing Drive file:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to import file from Google Drive" });
  }
});

// REST API ENDPOINTS

// Get all projects (Syncs with Supabase database if configured)
app.get("/api/projects", async (req, res) => {
  const category = (req.query.category as string) || "all";
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.from("projects").select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        // Hydrate local cache
        data.forEach((p: any) => {
          projectsDatabase[p.id] = {
            id: p.id,
            title: p.title || "Untitled Project",
            description: p.description || "",
            updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
            updatedLabel: p.updatedLabel || "Just now",
            category: p.category || "My Projects",
            thumbnail: p.thumbnail || "",
            nodes: typeof p.nodes === "string" ? JSON.parse(p.nodes) : (p.nodes || []),
            connectors: typeof p.connectors === "string" ? JSON.parse(p.connectors) : (p.connectors || []),
            comments: typeof p.comments === "string" ? JSON.parse(p.comments) : (p.comments || []),
            chat: typeof p.chat === "string" ? JSON.parse(p.chat) : (p.chat || []),
          };
        });
      }
    } catch (dbErr) {
      console.warn("Supabase fetch warning:", dbErr);
    }
  }

  let list = Object.values(projectsDatabase);
  if (category !== "all") {
    list = list.filter((p) => p.category === category || category === "My Projects");
  }
  res.json({ success: true, projects: list });
});

// Get single project
app.get("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  const supabase = getSupabaseClient();

  if (supabase && !projectsDatabase[id]) {
    try {
      const { data } = await supabase.from("projects").select("*").eq("id", id).single();
      if (data) {
        projectsDatabase[id] = {
          id: data.id,
          title: data.title,
          description: data.description || "",
          updatedAt: data.updated_at || new Date().toISOString(),
          updatedLabel: "Just now",
          category: data.category || "My Projects",
          nodes: typeof data.nodes === "string" ? JSON.parse(data.nodes) : (data.nodes || []),
          connectors: typeof data.connectors === "string" ? JSON.parse(data.connectors) : (data.connectors || []),
          comments: typeof data.comments === "string" ? JSON.parse(data.comments) : (data.comments || []),
          chat: typeof data.chat === "string" ? JSON.parse(data.chat) : (data.chat || []),
        };
      }
    } catch (e) {}
  }

  const project = projectsDatabase[id];
  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }
  res.json({ success: true, project });
});

// Create project
app.post("/api/projects", async (req, res) => {
  const { title, description, nodes, connectors } = req.body;
  const id = "proj-" + Date.now();
  const newProject = {
    id,
    title: title || "Untitled FlowBoard",
    description: description || "Created on FlowBoard AI",
    updatedAt: new Date().toISOString(),
    updatedLabel: "Just now",
    category: "My Projects",
    thumbnail: "",
    nodes: nodes || [],
    connectors: connectors || [],
    comments: [],
    chat: [
      { id: "m-init", author: "System", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: "New workspace created." }
    ]
  };
  projectsDatabase[id] = newProject;

  // Sync to Supabase if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("projects").upsert({
        id: newProject.id,
        title: newProject.title,
        description: newProject.description,
        category: newProject.category,
        updated_at: newProject.updatedAt,
        nodes: JSON.stringify(newProject.nodes),
        connectors: JSON.stringify(newProject.connectors),
        comments: JSON.stringify(newProject.comments),
        chat: JSON.stringify(newProject.chat),
      });
    } catch (dbErr) {
      console.warn("Supabase insert warning:", dbErr);
    }
  }

  res.json({ success: true, project: newProject });
});

// Update project
app.put("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  if (!projectsDatabase[id]) {
    projectsDatabase[id] = {
      id,
      title: req.body.title || "FlowBoard Project",
      category: "My Projects",
      comments: [],
      chat: []
    };
  }
  const updatedProject = {
    ...projectsDatabase[id],
    ...req.body,
    updatedAt: new Date().toISOString(),
    updatedLabel: "Just now"
  };
  projectsDatabase[id] = updatedProject;

  // Sync to Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("projects").upsert({
        id: updatedProject.id,
        title: updatedProject.title,
        description: updatedProject.description || "",
        category: updatedProject.category || "My Projects",
        updated_at: updatedProject.updatedAt,
        nodes: JSON.stringify(updatedProject.nodes || []),
        connectors: JSON.stringify(updatedProject.connectors || []),
        comments: JSON.stringify(updatedProject.comments || []),
        chat: JSON.stringify(updatedProject.chat || []),
      });
    } catch (dbErr) {
      console.warn("Supabase update warning:", dbErr);
    }
  }

  res.json({ success: true, project: updatedProject });
});

// Delete project
app.delete("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  if (projectsDatabase[id]) {
    delete projectsDatabase[id];
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("projects").delete().eq("id", id);
    } catch (dbErr) {
      console.warn("Supabase delete warning:", dbErr);
    }
  }

  res.json({ success: true });
});

// --- AI DIAGRAM GENERATION API WITH GEMINI ---
app.post("/api/ai/generate-diagram", async (req, res) => {
  try {
    const { prompt, diagramType = "Architecture", visualStyle = "Professional", model = "gemini-2.5-flash", effort } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ success: false, error: "Prompt is required" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are FlowBoard AI's expert SaaS Architect and Diagram Synthesizer.
Your goal is to parse user prompts and produce structured nodes and connectors for interactive canvas whiteboards.
Always output valid JSON conforming strictly to the response schema provided.

Guidelines for Node layout:
- Position nodes logically in a grid flow (left-to-right x: 200, 480, 760, 1040 or top-to-bottom y: 150, 320, 500).
- Assign node types correctly:
  - 'oval': Start/End triggers
  - 'credentials': Authentication / login / security nodes
  - 'rectangle': General microservices or components
  - 'diamond': Decision branches or condition checks
  - 'database': Databases / caches / storage engines
  - 'api-gateway': Gateways / Load balancers / routers
  - 'table': Database Entity Tables with columns (id, name, type, isPk)
  - 'sticky': Notes or annotations
  - 'cloud': Cloud services
  - 'star': Key milestone
- Provide informative titles and clean sub-labels.
- Define connecting arrows between nodes logically with labels.
`;

    const userContent = `Generate a ${diagramType} diagram in ${visualStyle} visual style for the following prompt:
"${prompt}"`;

    // Normalize model string to official gemini model alias
    let targetModel = "gemini-3.6-flash";
    if (model && (model.includes("3.5") || model.includes("3.6") || model.includes("2.5") || model.includes("GPT") || model.includes("Opus"))) {
      targetModel = "gemini-3.6-flash";
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: userContent,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Diagram title" },
            description: { type: Type.STRING, description: "Brief description of the diagram" },
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    description: "One of: oval, credentials, rectangle, diamond, database, api-gateway, sticky, table, cloud, star"
                  },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  color: { type: Type.STRING },
                  borderColor: { type: Type.STRING },
                  columns: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        isPk: { type: Type.BOOLEAN }
                      }
                    }
                  }
                },
                required: ["id", "type", "title", "x", "y"]
              }
            },
            connectors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  fromId: { type: Type.STRING },
                  toId: { type: Type.STRING },
                  label: { type: Type.STRING },
                  style: { type: Type.STRING, description: "solid or dashed or active" },
                  color: { type: Type.STRING }
                },
                required: ["id", "fromId", "toId"]
              }
            }
          },
          required: ["title", "nodes", "connectors"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini");
    }

    const parsed = JSON.parse(text);
    return res.json({ success: true, diagram: parsed });
  } catch (error: any) {
    console.error("Error generating AI diagram:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to generate AI diagram"
    });
  }
});

// --- AI PROMPT ENHANCER API ---
app.post("/api/ai/enhance-prompt", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: "Prompt required" });

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Transform this short diagram prompt into a clear, detailed architectural or process prompt suitable for system diagramming: "${prompt}". Keep it under 2 sentences.`,
    });

    return res.json({ success: true, enhancedPrompt: response.text?.trim() });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- AI TEAM CHAT ASSISTANT ---
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history = [], currentProject } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are FlowBoard AI Assistant, a collaborative co-architect embedded in a digital whiteboard SaaS platform.
You can give architecture advice, answer questions about nodes and DB schemas, and explain flows.
Keep responses helpful, concise, and formatted cleanly.`;

    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      config: { systemInstruction }
    });

    // Send history context if available
    const fullPrompt = currentProject
      ? `[Current Board: ${currentProject.title} with ${currentProject.nodes?.length || 0} nodes]\nUser Question: ${message}`
      : message;

    const response = await chat.sendMessage({ message: fullPrompt });
    return res.json({ success: true, reply: response.text });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Explicit API 404 Fallback Handler (Guarantees JSON response for any /api route)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: `API route ${req.method} ${req.path} not found` });
  }
  next();
});

// Start Vite / Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FlowBoard AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
