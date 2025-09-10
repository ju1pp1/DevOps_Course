#include <iostream>
#include <fstream>
#include <string>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sys/statvfs.h> // we can ignore this error, because Docker's image will have this header
                        // this cpp code will use Linux system calls
#include "httplib.h" // we will get this available when we build in Docker

static std::string iso_utc_now() {
    auto now = std::chrono::system_clock::now();
    std::time_t tt = std::chrono::system_clock::to_time_t(now);
    std::tm gmt{};
    gmtime_r(&tt, &gmt);
    char buf[25];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%SZ", &gmt);
    return std::string(buf);
}

static std::string uptime_hours() {
    std::ifstream f("/proc/uptime");
    double sec = 0.0;
    if (f) f >> sec;
    char out[16];
    std::snprintf(out, sizeof(out), "%.2f", sec/3600.0);
    return std::string(out);
}

static long free_disk_mb() {
    struct statvfs st{};
    if(statvfs("/", &st) == 0) {
        unsigned long long free_bytes = (unsigned long long)st.f_bavail * st.f_frsize;
        return (long)(free_bytes / (1024 * 1024));
    }
    return 0;
}

static void append_vstorage(const std::string& line) {
    std::ofstream ofs("/vstorage/log.txt", std::ios::app);
    ofs << line << "\n";
}

int main() {
    const char* storage_host = std::getenv("STORAGE_HOST");
    const char* storage_port = std::getenv("STORAGE_PORT");
    std::string host = storage_host ? storage_host : "storage";
    int port = storage_port ? std::stoi(storage_port) : 8080;

    httplib::Server svr;

    svr.Get("/status", [&](const httplib::Request&, httplib::Response& res) {
        std::string line = "Timestamp2:" + iso_utc_now() +
        " status: uptime " + uptime_hours() +
        " hours, free disk in root: " + std::to_string(free_disk_mb()) + " Mbytes";

        // POST to storage
        httplib::Client cli(host, port);
        auto r = cli.Post("/log", line, "text/plain");

        // Append to vstorage
        append_vstorage(line);

        res.set_content(line, "text/plain");
    });

    std::cout << "Service2 listening on 9090\n";
    svr.listen("0.0.0.0", 9090);
    return 0;
}