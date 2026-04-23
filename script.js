/**
 * SMART NOTES AI - SECURE VERSION
 * The API_KEY is injected via GitHub Actions Secrets during deployment.
 * This prevents the key from being visible in the GitHub repository history.
 */

// This variable is defined in index.html and replaced by GitHub Actions
// If you are testing locally, you can temporarily put your key here, 
// but DELETE IT before pushing to GitHub.
let currentActionItems = []; 

async function processNotes() {
    const inputText = document.getElementById("noteInput").value;
    
    // Check if API_KEY exists (Injected from the Action)
    if (typeof API_KEY === 'undefined' || API_KEY === "__API_KEY_PLACEHOLDER__") {
        alert("API Key missing. If you are developing locally, please define API_KEY in index.html.");
        return;
    }

    if (!inputText) {
        alert("Please enter some notes first!");
        return;
    }

    // UI Updates
    document.getElementById("loading").style.display = "block";
    document.getElementById("output").style.display = "none";
    document.getElementById("exportBtn").style.display = "none";
    document.getElementById("summarizeBtn").disabled = true;

    const promptText = `
    Analyze the following meeting notes. Extract the action items, who is responsible, and the deadline.
    Return ONLY a valid JSON object with this exact structure:
    {
      "actionItems": [
        {"task": "description", "person": "name", "due": "deadline"}
      ]
    }
    Notes: ${inputText}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleanJson);

        currentActionItems = result.actionItems;
        renderActionItems(currentActionItems);

    } catch (error) {
        console.error("AI Error:", error);
        alert("Failed to process notes. Check console for details.");
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
        btn.innerHTML = "✅ Copied!";
        setTimeout(() => btn.innerHTML = "Copy as Markdown", 2000);
    });
}