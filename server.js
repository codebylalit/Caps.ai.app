const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/download", (req, res) => {
  const { url, format } = req.body;

  if (!url) {
    return res.status(400).send("URL is required");
  }

  const command =
    format === "mp3" ? `yt-dlp -x --audio-format mp3 ${url}` : `yt-dlp ${url}`;

  exec(command, { cwd: "./downloads" }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error: ${stderr}`);
    }
    res.status(200).send(`Downloaded: ${stdout}`);
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
