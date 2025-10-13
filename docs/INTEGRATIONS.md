# Integrations Guide

Dieser Leitfaden bündelt praxisnahe Szenarien für Entwickler:innen und Fachanwender:innen, die den Willi-Mako Client in isolierten Containern, Low-Code-Weboberflächen oder Enterprise-Tools wie Power BI und n8n einsetzen möchten.

---

## 1. Docker Tooling Workspaces

**Ziel:** CLI und Skripte in einer sauberen, reproduzierbaren Umgebung ausführen.

1. **Image bauen** (siehe [`examples/docker/Dockerfile`](../examples/docker/Dockerfile)):
   ```bash
   docker build -t willi-mako-cli ./examples/docker
   ```
2. **CLI-Aufruf**:
   ```bash
   docker run --rm \
     -e WILLI_MAKO_TOKEN="$WILLI_MAKO_TOKEN" \
     willi-mako-cli openapi
   ```
3. **Skripte mounten**:
   ```bash
   docker run --rm \
     -e WILLI_MAKO_TOKEN="$WILLI_MAKO_TOKEN" \
     -v "$(pwd)/scripts:/workspace/scripts:ro" \
     --entrypoint node \
     willi-mako-cli --loader ts-node/esm /workspace/scripts/job.ts
   ```

**Best Practices**
- Hinterlegen Sie das Token über Docker Secrets oder `.env` Dateien (Compose).
- Für CI/CD Pipelines lohnt sich ein Multi-Stage-Build, der Ihre Tests ausführt und anschließend das CLI-Image veröffentlicht.
- Installieren Sie zusätzliche Abhängigkeiten (z. B. `axios`, `csv-parse`) über ein eigenes `Dockerfile`, das auf `willi-mako-cli` basiert.

---

## 2. Lightweight Web Interface

**Ziel:** Fachanwender:innen (z. B. MaKo-Team) können Sessions verwalten, Chat-/Reasoning-Aufgaben anstoßen und EDIFACT-Nachrichten prüfen – ganz ohne lokale Node.js Umgebung.

1. **Server starten**:
   ```bash
   node --loader ts-node/esm examples/web-dashboard.ts
   ```
2. **Browser öffnen:** `http://localhost:4173`
3. **Anmelden & Sessions verwalten:** Über die Login-Kachel Authentifizieren, Sessions anlegen/abrufen/löschen und anschließend Chat, semantische Suche, Reasoning, Kontextauflösung und Klarstellungsanalyse direkt im Browser nutzen.

**Anpassungen**
- **Branding & Layout:** Passen Sie HTML/CSS innerhalb von `examples/web-dashboard.ts` an.
- **Rollenbasierte Tokens:** Hinterlegen Sie unterschiedliche Tokens (z. B. Lesen/Schreiben) via Prozessumgebung.
- **Auth-Proxy:** Empfohlen für produktive Nutzung (z. B. Basic Auth, Reverse Proxy mit OAuth2 Proxy).
- **Mehrsprachigkeit:** Tauschen Sie Texte im HTML aus oder nutzen Sie ein Template-System.
- **Deployment:** Containerisieren Sie das Skript (siehe Docker-Abschnitt) oder nutzen Sie einen Node.js Application Service.

> ⚠️ **Sicherheit:** Das Token bleibt serverseitig. Stellen Sie sicher, dass nur autorisierte Personen Zugriff auf die Laufzeitumgebung haben.

---

## 3. Microsoft Power BI

**Ziel:** Kennzahlen aus Willi-Mako-Jobs direkt in Power BI Dashboards visualisieren.

### Vorgehen

1. **Parameter anlegen** (`WilliMakoToken`) und das API-Token sicher hinterlegen (Power BI Desktop: *Transform Data → Manage Parameters*).
2. **Power Query Skript** (M) für Sandbox-Jobs:
   ```m
   let
       Token = WilliMakoToken,
       Session = "powerbi-session-" & Text.From(DateTime.ToUnixTimestamp(DateTimeZone.UtcNow())),
       JobBody = Text.ToBinary(
           "{""sessionId"": """ & Session & """,
             ""source"": ""console.log(JSON.stringify({ aggregations: [1,2,3] }))"",
             ""timeoutMs"": 10000,
             ""metadata"": {""origin"": ""powerbi-demo""}
           }"
       ),
       StartJob = Json.Document(
           Web.Contents(
               "https://stromhaltig.de/api/v2/tools/run-node-script",
               [
                   Headers=[
                       Authorization="Bearer " & Token,
                       #"Content-Type"="application/json"
                   ],
                   Content = JobBody
               ]
           )
       ),
       JobId = StartJob[data][job][id],
       Poll = List.Generate(
           () => [Attempt = 0, Result = null, Status = "queued"],
           each [Attempt] < 20 and Text.Lower([Status]) <> "succeeded" and Text.Lower([Status]) <> "failed",
           each let
               Response = Json.Document(
                   Web.Contents(
                       "https://stromhaltig.de/api/v2/tools/jobs/" & JobId,
                       [Headers=[Authorization="Bearer " & Token]]
                   )
               )
           in [
               Attempt = [Attempt] + 1,
               Result = Response,
               Status = Response[data][job][status]
           ]
       ),
       Final = List.Last(Poll)[Result],
       Output = Final[data][job][result][stdout],
       JsonTable = if Output = null then #table({}, {}) else Table.FromRecords(Json.Document(Text.ToBinary(Output)))
   in
       JsonTable
   ```
3. **Dashboard bauen:** Nutzen Sie die resultierende Tabelle (`JsonTable`) für Visuals, Filter usw.

**Tipps**
- Ersetzen Sie die `source` im Payload durch Ihr eigenes Skript (Aggregation, Plausibilitätsprüfung etc.).
- Nutzen Sie Artefakte als dauerhafte Datenquelle: Erstellen Sie per Sandbox-Job ein Artefakt (`createArtifact`) und lesen Sie es via `Web.Contents("https://stromhaltig.de/api/v2/artifacts/<id>")` in Power BI ein.
- Nutzen Sie *Incremental Refresh* und Parameter, um Daten zeitlich oder nach Marktrolle zu partitionieren.

> 💡 **Hinweis:** Power BI Service benötigt einen **Gateway** oder eine Cloud-Source, um periodische Aktualisierungen durchzuführen. Hinterlegen Sie das Token auf dem Gateway als Secure Credential.

---

## 4. Model Context Protocol (MCP) Server

**Ziel:** Den Willi-Mako Client in KI-gestützte Entwicklungsumgebungen (z. B. VS Code, Cursor, Claude Desktop) einbinden.

1. **Server starten** (siehe [`examples/mcp-server.ts`](../examples/mcp-server.ts)):
    ```bash
    node --loader ts-node/esm examples/mcp-server.ts
    ```
    Der Server lauscht standardmäßig auf `http://127.0.0.1:7337/mcp`. Legen Sie `WILLI_MAKO_TOKEN` als Umgebungvariable fest, bevor Sie den Prozess starten.
2. **Client konfigurieren:** Fügen Sie in Ihrer IDE oder Ihrem Agenten eine MCP-Verbindung hinzu.
     - **VS Code / Cursor:**
         ```json
         {
             "mcpServers": {
                 "willi-mako": {
                     "command": "node",
                     "args": ["--loader", "ts-node/esm", "examples/mcp-server.ts"],
                     "env": {
                         "WILLI_MAKO_TOKEN": "${WILLI_MAKO_TOKEN}"
                     }
                 }
             }
         }
         ```
     - **Claude Desktop:** Einstellungen → *Model Context Protocol* → neuen Server mit `http://127.0.0.1:8080` hinzufügen.
3. **Werkzeuge & Ressourcen nutzen:** Der MCP-Server stellt u. a. die Tools `willi-mako.login`, `willi-mako.create-session`, `willi-mako.chat`, `willi-mako.semantic-search`, `willi-mako.reasoning-generate`, `willi-mako.resolve-context`, `willi-mako.clarification-analyze`, `willi-mako.create-node-script`, `willi-mako.get-tool-job`, `willi-mako.create-artifact` sowie die Resource `willi-mako://openapi` bereit. Agenten können damit komplette MaKo-Workflows automatisiert orchestrieren.

**Best Practices**
- Aktivieren Sie optional CORS-Domains via `ALLOWED_ORIGINS`, falls Sie den Server über einen Reverse Proxy bereitstellen.
- Nutzen Sie separate **Service Token** für IDE-Automatisierungen und hinterlegen Sie diese in einer Secret-Manager-Lösung.
- Beobachten Sie Logs (stdout) auf Tool- und Resource-Aufrufe, um Tuning-Möglichkeiten für Prompts oder Workflow-Pfade zu identifizieren.
- Ergänzen Sie bei Bedarf weitere Tools im MCP-Server (z. B. `list-artifacts`, `list-jobs`) – die Struktur in `examples/mcp-server.ts` ist modular gehalten.

---

## 5. n8n Automations

**Ziel:** Marktkommunikationsprozesse mit vorkonfigurierten n8n Nodes automatisieren.

### Workflow-Beispiel

1. **Credential anlegen:** *Settings → Credentials → HTTP Request*. Setzen Sie `Name`, Basis-URL `https://stromhaltig.de/api/v2` und `Header Authorization: Bearer {{$env.WILLI_MAKO_TOKEN}}`.
2. **Node 1 – HTTP Request (POST `tools/run-node-script`):**
   - Methode: `POST`
   - URL: `/tools/run-node-script`
   - Body: RAW JSON, z. B. `{"sessionId":"n8n-session","source":"console.log(JSON.stringify({ status: 'ok' }))"}`
3. **Node 2 – Wait:** 2–3 Sekunden Delay oder `Wait for Webhook` falls gewünscht.
4. **Node 3 – HTTP Request (GET `tools/jobs/{{ $json["data"]["job"]["id"] }}`):**
   - Methode: `GET`
   - URL: `/tools/jobs/{{$json["data"]["job"]["id"]}}`
5. **Node 4 – Function:** Parse `items[0].json.data.job.result.stdout` in ein Objekt und entscheiden über weitere Aktionen (z. B. Artefakt speichern, Slack Notification, E-Mail).

### Tipps

- Nutzen Sie den **Code Node**, um komplexe Payloads zu erzeugen (z. B. Listen von Zählpunkten).
- Verwenden Sie **Error Workflows** in n8n, um auf API-Fehler (`WilliMakoError`) zu reagieren.
- Speichern Sie Artefakte über einen zusätzlichen HTTP-Request (`POST /artifacts`) und hängen Sie diese an Tickets oder E-Mails an.
- Für langfristige Workflows lässt sich das Dashboard-Skript (`examples/web-dashboard.ts`) als Basis nutzen und über die n8n *Webhook*-Nodes ansteuern.

---

## Weiterführende Ressourcen

- [`README.md`](../README.md) – Überblick & Quickstarts.
- [`examples/mcp-server.ts`](../examples/mcp-server.ts) – Vollständiger MCP Server mit Tools & Ressourcen.
- [`docs/API.md`](./API.md) – Endpunkte im Detail.
- [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) – Fehleranalyse & Logging.
- [`examples/`](../examples) – Weitere Skripte und Demos.

Bei Fragen oder Erweiterungswünschen: [dev@stromdao.com](mailto:dev@stromdao.com) oder GitHub-Issues.
