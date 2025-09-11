FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY service2.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /out

# runtime (ASP.NET shared framework)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app
COPY --from=build /out ./
VOLUME ["/vstorage"]
ENV STORAGE_HOST=storage
ENV STORAGE_PORT=8080
# could use: ENV ASPNETCORE_URLS=http://0.0.0.0:9090 instead of writing it inside app.Run in .cs file.
EXPOSE 9090
CMD ["dotnet", "service2.dll"]