// Get the key from the browser's local storage
let API_KEY = localStorage.getItem("AIzaSyAiKTeYwLGdWih4oZHfe43DqiBIFikl55Q");

let currentActionItems = []; // Stores current items for export

async function processNotes() {
    // 1. SECURITY CHECK: If no key is found, ask the user to provide one
    if (!API_KEY) {
        const userKey = prompt("SECURITY: No API Key found. Please enter your Gemini API Key. (This is saved locally in your browser and not uploaded to GitHub):");
        if (userKey && userKey.trim() !== "") {
            localStorage.setItem("GEMINI_API_KEY", userKey.trim());
            API_KEY = userKey.trim();
        } else {
            alert("An API Key is required to use the Smart Notes AI.");
            return;
        }
    }

    const inputText = document.getElementById("noteInput").value;
    if (!inputText) {
        alert("Please enter some notes first!");
        return;
    }

    // UI Updates: Show loading, hide previous results
    document.getElementById("loading").style.display = "block";
    document.getElementById("output").style.display = "none";
    document.getElementById("exportBtn").style.display = "none";
    document.getElementById("summarizeBtn").disabled = true;

    const promptText = `
    Analyze the following meeting notes. Extract the action items, who is responsible, and the deadline.
    Return ONLY a valid JSON object with this exact structure, nothing else:
    {
      "actionItems": [
        {"task": "description", "person": "name", "due": "deadline"}
      ]
    }
    Notes: ${inputText}`;

    try {
        // UPDATED MODEL: Using gemini-2.5-flash for the 2026 API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();
        
        // Comprehensive Error Handling
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            if (data.error.status === "UNAUTHENTICATED") {
                alert("Invalid API Key. Clearing saved key. Please refresh and try again with a valid key.");
                localStorage.removeItem("GEMINI_API_KEY");
                location.reload();
            } else {
                alert(`API Error: ${data.error.message}`);
            }
            throw new Error(data.error.message);
        }

        const rawText = data.candidates[0].content.parts[0].text;
        
        // Clean the response (sometimes AI wraps JSON in backticks)
        const cleanJson = rawText.replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleanJson);

        currentActionItems = result.actionItems;
        renderActionItems(currentActionItems);

    } catch (error) {
        console.error("Application Error:", error);
        alert("Failed to process notes. Check the browser console (F12) for the specific error code.");
    } finally {
        document.getElementById("loading").style.display = "none";
        document.getElementById("summarizeBtn").disabled = false;
    }
}

function renderActionItems(items) {
    const list = document.getElementById("actionList");
    list.innerHTML = "";
    
    items.forEach((item, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <input type="checkbox" id="item-${index}">
            <label for="item-${index}">
                <strong>${item.person}:</strong> ${item.task} <em>(Due: ${item.due})</em>
            </label>
        `;
        list.appendChild(li);
    });

    document.getElementById("output").style.display = "block";
    document.getElementById("exportBtn").style.display = "block";
}

function copyAsMarkdown() {
    if (currentActionItems.length === 0) return;

    let markdown = "### 📝 Action Items\n\n";
    currentActionItems.forEach(item => {
        markdown += `- [ ] **${item.person}:** ${item.task} (Due: ${item.due})\n`;
    });

    navigator.clipboard.writeText(markdown).then(() => {
        const btn = document.getElementById("exportBtn");
        const originalText = btn.innerHTML;
        btn.innerHTML = "✅ Copied!";
        setTimeout(() => btn.innerHTML = originalText, 2000);
    });
}