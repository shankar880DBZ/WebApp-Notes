const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs").promises;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

const filesDir = path.join(__dirname, "files");

// Ensure files directory exists
(async () => {
    try {
        await fs.mkdir(filesDir, { recursive: true });
    } catch (error) {
        console.error("Failed to create directory:", error);
    }
})();

// Read files and render home page
app.get("/", async (req, res) => {
    try {
        const filenames = await fs.readdir(filesDir);
        const tasks = await Promise.all(
            filenames.map(async (filename) => {
                try {
                    const content = await fs.readFile(path.join(filesDir, filename), "utf-8");
                    return { titles: filename.replace(".txt", ""), message: content };
                } catch {
                    return null;
                }
            })
        );
        res.render("index", { files: tasks.filter(Boolean) });
    } catch (error) {
        console.error("Error loading tasks:", error);
        res.status(500).render("error", { errorMessage: "Failed to load tasks" });
    }
});

// Get specific file content
app.get("/files/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(filesDir, filename);

        await fs.access(filePath); // Check if the file exists
        const filedata = await fs.readFile(filePath, "utf-8");
        res.render("file", { filename, filedata });
    } catch (error) {
        console.error("File not found:", error);
        res.status(404).render("error", { errorMessage: "File not found" });
    }
});

// Edit file page
app.get("/edit/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(filesDir, filename);

        await fs.access(filePath); // Check if the file exists
        const filedata = await fs.readFile(filePath, "utf-8");
        res.render("edit", { filename, filedata });
    } catch (error) {
        console.error("File not found:", error);
        res.status(404).render("error", { errorMessage: "File not found" });
    }
});

// Update file title
app.post("/edit", async (req, res) => {
    const previousTitle = req.body.previous.trim();
    const newTitle = req.body.new.trim();

    if (!previousTitle || !newTitle) {
        return res.status(400).send("Title is required.");
    }

    const oldFilePath = path.join(filesDir, `${previousTitle.replace(/\s+/g, "_")}.txt`);
    const newFilePath = path.join(filesDir, `${newTitle.replace(/\s+/g, "_")}.txt`);

    try {
        await fs.access(oldFilePath); // Ensure the file exists before renaming
        await fs.rename(oldFilePath, newFilePath);
        res.redirect("/");
    } catch (error) {
        console.error("Failed to rename task:", error);
        res.status(500).render("error", { errorMessage: "Failed to rename task" });
    }
});


app.get("/delete/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(filesDir, filename);

        await fs.access(filePath); // Check if the file exists
        await fs.unlink(filePath); // Delete the file
        res.redirect("/");
    } catch (error) {
        console.error("File not found:", error);
        res.status(404).render("error", { errorMessage: "File not found" });
    }
})
// Create and save new file
app.post("/create", async (req, res) => {
    const title = req.body.titles.trim();
    const message = req.body.message.trim();

    if (!title || !message) {
        return res.status(400).send("Title and message are required.");
    }

    const fileName = `${title.replace(/\s+/g, "_")}.txt`;
    const filePath = path.join(filesDir, fileName);

    try {
        await fs.writeFile(filePath, message, { flag: "wx" }); // Prevent overwriting existing files
        res.redirect("/");
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).render("error", { errorMessage: "Failed to create task or file already exists" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
