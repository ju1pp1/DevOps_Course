using System.Diagnostics;
using System.Net.Http;
var app = WebApplication.CreateBuilder(args).Build();

string IsoUtc() => DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");

// Read system uptime from /proc/uptime
string UptimeHours()
{
    var text = System.IO.File.ReadAllText("/proc/uptime");
    var sec = double.Parse(text.Split(' ')[0], System.Globalization.CultureInfo.InvariantCulture);
    return (sec / 3600.0).ToString("0.00");
}
//This runs 'df' to get fre disk space in MB for the root filesystem 
string FreeDiskMB()
{
    var psi = new ProcessStartInfo("sh", "-c \"df -Pm / | tail -1 | awk '{print $4}'\"");
    psi.RedirectStandardOutput = true;
    var p = Process.Start(psi); p.WaitForExit();
    return p.StandardOutput.ReadToEnd().Trim();
}

// GET /status, build status record and send it to storage
app.MapGet("/status", async () =>
{
    var line = $"Timestamp2:{IsoUtc()} status: uptime {UptimeHours()} hours, free disk in root: {FreeDiskMB()} MBytes";
    var http = new HttpClient();
    var host = Environment.GetEnvironmentVariable("STORAGE_HOST") ?? "storage";
    var port = Environment.GetEnvironmentVariable("STORAGE_PORT") ?? "8080";

    // POST the record to Storage, and append to vStorage
    await http.PostAsync($"http://{host}:{port}/log", new StringContent(line, System.Text.Encoding.UTF8, "text/plain"));
    Directory.CreateDirectory("/vstorage");
    await File.AppendAllTextAsync("/vstorage/log.txt", line + "\n");
    return Results.Text(line, "text/plain");
});

app.Run("http://0.0.0.0:9090");