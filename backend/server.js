const express = require("express");
const cors = require("cors");
const os = require("os");
const fs = require("fs");
const multer = require("multer");
const useragent = require("useragent");

const app = express();
const PORT = 3000;

// CORS Configuration
const corsOptions = {
    origin: "*", // Allow all origins
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type"
};

app.use(cors(corsOptions));
app.use(express.json());

// Ensure logs and uploads directories exist
const archiveDir = "./logs";
const uploadDir = "./uploads";
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const accessLogFilePath = `${archiveDir}/access_logs.json`;

// Function to get Private IP
const getPrivateIP = () => {
    const interfaces = os.networkInterfaces();
    for (let interfaceName in interfaces) {
        for (let iface of interfaces[interfaceName]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "Unknown";
};

// Function to read logs safely
const readLogs = () => {
    if (!fs.existsSync(accessLogFilePath)) return [];
    try {
        const fileData = fs.readFileSync(accessLogFilePath, "utf8");
        return JSON.parse(fileData);
    } catch (error) {
        console.error("❌ Error reading logs:", error);
        return [];
    }
};

// Function to write logs safely
const writeLogs = (logs) => {
    try {
        fs.writeFileSync(accessLogFilePath, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error("Error writing logs:", error);
    }
};

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// API to log visits and file uploads in the same log file
app.post("/logVisit", (req, res) => {
    try {
        const { 
            timestamp, url, httpMethod, responseStatus, referer, publicIp, geoLocation, 
            isTorOrVPN, serverIp, searchQuery, userEmail, userAgent, deviceType, 
            sessionId, riskScore, eventType, fileName, fileType, fileSize, userFilePath 
        } = req.body;

        if (!url || !publicIp || !userAgent) {
            return res.status(400).json({ message: "Invalid request data" });
        }

        const agent = useragent.parse(userAgent);
        const logEntry = {
            timestamp: timestamp || new Date().toISOString(),
            eventType: eventType || "Visit",
            url,
            httpMethod,
            responseStatus,
            referer,
            publicIp,
            privateIp: getPrivateIP(),
            serverIp,
            geoLocation,
            isTorOrVPN,
            searchQuery,
            userEmail: userEmail || "Unknown",
            userAgent,
            browser: agent.family + " " + agent.major || "Unknown",
            osInfo: agent.os.toString() || "Unknown",
            device: agent.device.toString() || "Unknown",
            deviceType: deviceType || "Unknown",
            sessionId: sessionId || "Unknown",
            riskScore: riskScore || "Unknown"
        };

        // If it's a file upload, add file details
        if (eventType === "File Upload") {
            logEntry.fileName = fileName;
            logEntry.fileType = fileType;
            logEntry.fileSize = fileSize;
            logEntry.userFilePath = userFilePath || "Unknown";
        }

        const logs = readLogs();
        logs.push(logEntry);
        writeLogs(logs);

        console.log("Log saved:", logEntry);
        res.json({ message: "Log saved", privateIp: getPrivateIP() });

    } catch (error) {
        console.error("Error processing logVisit:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// API to handle file uploads and log them
app.post("/uploadFile", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            eventType: "File Upload",
            userEmail: req.body.userEmail || "Unknown",
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            serverFilePath: `uploads/${req.file.filename}`,
            userFilePath: req.body.userFilePath || "Unknown"
        };

        const logs = readLogs();
        logs.push(logEntry);
        writeLogs(logs);

        console.log("Upload Log saved:", logEntry);
        res.json({
            message: "File uploaded successfully",
            serverFilePath: logEntry.serverFilePath,
            userFilePath: logEntry.userFilePath
        });

    } catch (error) {
        console.error("Error processing file upload:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// API to get all logs
app.get("/getLogs", (req, res) => {
    try {
        const logs = readLogs();
        res.json(logs);
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
