document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get("logs", (data) => {
        const logs = data.logs || [];
        const logList = document.getElementById("log-list");

        logList.innerHTML = ""; // Clear previous entries before appending

        if (logs.length === 0) {
            logList.innerHTML = "<li>No logs found.</li>";
            return;
        }

        logs.forEach((log) => {
            const listItem = document.createElement("li");

            // Format timestamp (12-hour format & full date)
            const formattedTime = log.timestamp ? formatTimestamp(log.timestamp) : "Unknown Time";
            const fullDate = log.timestamp ? formatFullDate(log.timestamp) : "Unknown Date";

            // Break long URLs into multiple lines
            const formattedUrl = log.url ? breakLongText(log.url, 50) : "No URL Logged";

            listItem.innerHTML = `
                <div><strong>Date:</strong> ${fullDate}</div>
                <div><strong>Time:</strong> ${formattedTime}</div>
                <div><strong>URL:</strong> ${formattedUrl}</div>
                <div><strong>Public IP:</strong> ${log.publicIp || "Unknown"}</div>
                <div><strong>Private IP:</strong> ${log.privateIp || "Unknown"}</div>
                <div><strong>Server IP:</strong> ${log.serverIp || "Unknown"}</div>
                <div><strong>Search Query:</strong> ${log.searchQuery || "N/A"}</div>
                <div><strong>User Email:</strong> ${log.userEmail || "Not Available"}</div>
                <div><strong>Device Type:</strong> ${log.deviceType || "Unknown"}</div>
                <div><strong>Risk Score:</strong> ${log.riskScore || "N/A"}</div>
                <div><strong>Session ID:</strong> ${log.sessionId || "N/A"}</div>
                <hr> <!-- Separator for readability -->
            `;

            logList.appendChild(listItem);
        });

        console.log("✅ Logs retrieved:", logs); // Debugging log
    });
});

// Function to format timestamp into 12-hour AM/PM format
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        console.error("❌ Invalid timestamp:", timestamp);
        return "Invalid Time";
    }

    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}

// Function to display full date
function formatFullDate(timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        console.error("❌ Invalid timestamp:", timestamp);
        return "Invalid Date";
    }

    return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

// Function to break long text (like URLs) into multiple lines
function breakLongText(text, maxLength) {
    return text.replace(new RegExp(`(.{${maxLength}})`, "g"), "$1<br>");
}
