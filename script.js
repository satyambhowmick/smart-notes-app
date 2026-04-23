// PUT YOUR REAL API KEY HERE
const API_KEY = "AIzaSyAliL3cUDiex3pE4Hpq2XV0KyZfAp4pIi0"; 

let currentActionItems = []; // Stores current items for export

async function processNotes() {
    const inputText = document.getElementById("noteInput").value;
    if (!inputText) {
        alert("Please enter some notes first!");
        return;
    }

    document.getElementById("loading").style.display = "block";
    document.getElementById("output").style.display = "none";
    document.getElementById("exportBtn").style.display = "none";
    document.getElementById("summarizeBtn").disabled = true;

    const prompt = `
    Analyze the following meeting notes. Extract the action items, who is responsible, and the deadline.
    Return ONLY a valid JSON object with this exact structure, nothing else:
    {
      "action_items": [
        {"owner": "Name", "task": "What they need to do", "deadline": "When it's due or 'None'"}
      ]
    }
    
    Meeting Notes:
    "${inputText}"
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error?.message || "API Error");
        
        let aiText = data.candidates[0].content.parts[0].text;
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const resultJSON = JSON.parse(aiText);
        currentActionItems = resultJSON.action_items || [];
        
        renderChecklist(currentActionItems);
        saveToHistory(currentActionItems); // Constraint: Local Persistence
        
        document.getElementById("output").style.display = "block";
        document.getElementById("exportBtn").style.display = "block";

    } catch (error) {
        console.error("Full Error Details:", error);
        alert("Error: " + error.message);
    } finally {
        document.getElementById("loading").style.display = "none";
        document.getElementById("summarizeBtn").disabled = false;
    }
}

function renderChecklist(items) {
    const checklistDiv = document.getElementById("checklist");
    checklistDiv.innerHTML = "";

    if (!items || items.length === 0) {
        checklistDiv.innerHTML = "<p>No action items found.</p>";
        return;
    }

    items.forEach(item => {
        checklistDiv.innerHTML += `
            <div class="checklist-item">
                <input type="checkbox">
                <label><strong>${item.owner}:</strong> ${item.task} <em>(Due: ${item.deadline})</em></label>
            </div>
        `;
    });
}

// Constraint 1: Save last 5 to LocalStorage
function saveToHistory(items) {
    if (items.length === 0) return;
    let history = JSON.parse(localStorage.getItem('smartNotesHistory')) || [];
    history.unshift(items); // Add newest to the top
    if (history.length > 5) history.pop(); // Remove oldest if over 5
    localStorage.setItem('smartNotesHistory', JSON.stringify(history));
}

// Constraint 2: Markdown Export Engine
function exportMarkdown() {
    if (currentActionItems.length === 0) return;
    
    let mdText = "### 📝 Smart Notes - Action Items\n\n";
    currentActionItems.forEach(item => {
        mdText += `- [ ] **${item.owner}**: ${item.task} *(Due: ${item.deadline})*\n`;
    });

    navigator.clipboard.writeText(mdText).then(() => {
        alert("Copied to clipboard as Markdown! You can paste it anywhere.");
    }).catch(err => {
        console.error("Failed to copy", err);
    });
}