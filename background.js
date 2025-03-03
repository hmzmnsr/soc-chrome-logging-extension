chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "logVisit" || request.action === "logFileUpload") {
        const timestamp = new Date().toISOString();
        const url = request.url;
        let publicIp = "Unknown";
        let serverIp = "Unknown";
        let privateIp = "Unknown";
        let userEmail = "Not Available";
        let referer = "N/A";
        let httpMethod = "GET";
        let responseStatus = 200;
        let deviceType = navigator.userAgent.includes("Mobi") ? "Mobile" : "Desktop";
        let userAgent = navigator.userAgent;
        let sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        let riskScore = "Low";
        let geoLocation = "Unknown";
        let isTorOrVPN = "Unknown";

        let logEntry = { 
            timestamp, 
            eventType: request.action === "logFileUpload" ? "File Upload" : "Visit",
            url, 
            publicIp, 
            privateIp, 
            serverIp, 
            userEmail, 
            referer, 
            httpMethod, 
            responseStatus, 
            deviceType, 
            userAgent, 
            sessionId, 
            riskScore, 
            geoLocation, 
            isTorOrVPN 
        };

        if (request.action === "logVisit") {
            logEntry.searchQuery = request.searchQuery || "N/A";
        }

        if (request.action === "logFileUpload") {
            logEntry.fileName = request.fileName;
            logEntry.fileType = request.fileType;
            logEntry.fileSize = request.fileSize;
            logEntry.userFilePath = request.userFilePath || `Unknown/${request.fileName}`;
        }

        try {
            // Fetch Public IP
            const publicIpResponse = await fetch("https://api64.ipify.org?format=json");
            const publicIpData = await publicIpResponse.json();
            logEntry.publicIp = publicIpData.ip;

            // Get geolocation of the IP
            const geoResponse = await fetch(`http://ip-api.com/json/${logEntry.publicIp}`);
            const geoData = await geoResponse.json();
            if (geoData.status === "success") {
                logEntry.geoLocation = `${geoData.city}, ${geoData.country} (${geoData.lat}, ${geoData.lon})`;
            }

            // Check if IP is from Tor or VPN
            const vpnCheckResponse = await fetch(`https://ipqualityscore.com/api/json/ip/YOUR_API_KEY/${logEntry.publicIp}`);
            const vpnCheckData = await vpnCheckResponse.json();
            logEntry.isTorOrVPN = vpnCheckData.proxy || vpnCheckData.tor ? "Yes" : "No";

            // Extract domain name from URL
            const urlObject = new URL(url);
            const domainName = urlObject.hostname;

            // Get actual server IP using Google DNS API
            const dnsResponse = await fetch(`https://dns.google/resolve?name=${domainName}&type=A`);
            const dnsData = await dnsResponse.json();
            if (dnsData.Answer && dnsData.Answer.length > 0) {
                logEntry.serverIp = dnsData.Answer[0].data;
            }

            // Fetch logged-in Google email
            chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, async (userInfo) => {
                if (userInfo.email) {
                    logEntry.userEmail = userInfo.email;
                }

                // Get referer using active tab information
                chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                    if (tabs.length > 0 && tabs[0].url) {
                        logEntry.referer = new URL(tabs[0].url).origin || "N/A";
                    }

                    // Dynamically assess risk score
                    assessRisk(logEntry.publicIp, url, logEntry.userAgent, logEntry.isTorOrVPN).then((calculatedRiskScore) => {
                        logEntry.riskScore = calculatedRiskScore;

                        // Send data to backend
                        fetch("http://localhost:3000/logVisit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(logEntry)
                        }).then(response => response.json())
                          .then((backendData) => {
                              logEntry.privateIp = backendData.privateIp || "Unknown";

                              // Store logs properly
                              chrome.storage.local.get({ logs: [] }, (data) => {
                                  const logs = data.logs || [];
                                  logs.push(logEntry);
                                  chrome.storage.local.set({ logs }, () => {
                                      console.log("✅ Log saved:", logEntry);
                                  });
                              });
                          }).catch(error => console.error("❌ Error sending log to backend:", error));
                    });
                });
            });

        } catch (error) {
            console.error("❌ Error fetching data:", error);
        }
    }
});

// Function to dynamically assess risk score (includes Tor/VPN check)
async function assessRisk(publicIp, url, userAgent, isTorOrVPN) {
    let riskScore = "Low";

    try {
        // Check if the IP is blacklisted
        const ipCheckResponse = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${publicIp}`, {
            method: "GET",
            headers: { "Key": "YOUR_ABUSEIPDB_API_KEY", "Accept": "application/json" }
        });
        const ipCheckData = await ipCheckResponse.json();
        const abuseConfidenceScore = ipCheckData.data?.abuseConfidenceScore || 0;

        // Define suspicious terms
        const suspiciousTerms = ["hacking", "phishing", "malware", "carding", "exploit", "sql injection"];

        // Risk Level Calculation
        if (isTorOrVPN === "Yes") {
            riskScore = "High"; // VPN/Tor users often bypass security
        }

        if (abuseConfidenceScore > 90) {
            riskScore = "Critical";
        } else if (abuseConfidenceScore > 60) {
            riskScore = "High";
        } else if (abuseConfidenceScore > 30) {
            riskScore = "Medium";
        }

        if (suspiciousTerms.some(term => url.toLowerCase().includes(term))) {
            riskScore = (riskScore === "Low") ? "Medium-Low" : "Medium";
        }

        if (userAgent.includes("Chrome/49") || userAgent.includes("MSIE")) {
            riskScore = (riskScore === "Low") ? "Medium-Low" : "Medium";
        }

    } catch (error) {
        console.error("❌ Risk assessment error:", error);
    }

    return riskScore;
}


//working