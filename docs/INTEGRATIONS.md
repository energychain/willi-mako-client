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
    willi-mako --token "$WILLI_MAKO_TOKEN" serv --port 4173
    ```
2. **Browser öffnen:** `http://localhost:4173`
3. **Anmelden & Sessions verwalten:** Über die Login-Kachel Authentifizieren, Sessions anlegen/abrufen/löschen und anschließend Chat, semantische Suche, Reasoning, Kontextauflösung und Klarstellungsanalyse direkt im Browser nutzen.

**Anpassungen**
- **Branding & Layout:** Passen Sie HTML/CSS innerhalb von `src/demos/web-dashboard.ts` an oder forken Sie das Beispielskript unter `examples/web-dashboard.ts`.
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

1. **Server starten** (CLI-Befehl, optional basierend auf [`src/demos/mcp-server.ts`](../src/demos/mcp-server.ts)):
    ```bash
    willi-mako mcp --port 7337
    ```
    Der Transport lauscht auf `http://127.0.0.1:7337/mcp`. Für die Authentifizierung stehen mehrere Wege zur Verfügung:
    - **Bearer** – `Authorization: Bearer <token>` mitsenden oder wie gewohnt `--token` / `WILLI_MAKO_TOKEN` setzen.
    - **Basic** – `Authorization: Basic base64(email:password)` verwenden; der Server tauscht die Credentials automatisch gegen ein JWT und cached sie pro MCP-Session.
    - **Tool-Login** – Ohne Header das Tool `willi-mako.login` aufrufen. Das Ergebnis wird je MCP-Session gespeichert und kann für Folge-Requests genutzt werden.
    Fehlt eine `sessionId`, erzeugt der Server automatisch eine Willi-Mako-Session und übermittelt die ID in der Antwort.
2. **Client konfigurieren:** Fügen Sie in Ihrer IDE oder Ihrem Agenten eine MCP-Verbindung hinzu.
     - **VS Code / Cursor:**
         ```json
         {
             "mcpServers": {
                 "willi-mako": {
                     "command": "willi-mako",
                     "args": ["mcp"],
                     "env": {
                         "WILLI_MAKO_TOKEN": "${WILLI_MAKO_TOKEN}"
                     }
                 }
             }
         }
         ```
     - **Claude Desktop:** Einstellungen → *Model Context Protocol* → neuen Server mit `http://127.0.0.1:8080` hinzufügen.
3. **Werkzeuge & Ressourcen nutzen:** Der MCP-Server stellt u. a. die Tools `willi-mako.login`, `willi-mako.create-session`, `willi-mako.chat`, `willi-mako.semantic-search`, `willi-mako.reasoning-generate`, `willi-mako.resolve-context`, `willi-mako.clarification-analyze`, `willi-mako.generate-tool`, `willi-mako.create-node-script`, `willi-mako.get-tool-job`, `willi-mako.create-artifact` sowie die Resource `willi-mako://openapi` bereit. Agenten können damit komplette MaKo-Workflows automatisiert orchestrieren.

**Best Practices**
- Nutzen Sie separate **Service Token** oder verwaltete Benutzer-Credentials für IDE-Automatisierungen und pflegen Sie diese in einer Secret-Manager-Lösung.
- Beobachten Sie Logs (stdout) auf Tool- und Resource-Aufrufe, um Tuning-Möglichkeiten für Prompts oder Workflow-Pfade zu identifizieren.
- Ergänzen Sie bei Bedarf weitere Tools im MCP-Server (z. B. `list-artifacts`, `list-jobs`) – die Struktur in `src/demos/mcp-server.ts` ist modular gehalten.

---

### Schritt-für-Schritt: MCP-Integrationen in gängigen Umgebungen

> Alle Beispiele setzen voraus, dass der Willi-Mako MCP Server lokal läuft (`willi-mako mcp --port 7337`). Für entfernte Deployments passen Sie die URL entsprechend an.

#### VS Code & GitHub Copilot

1. **Server hinzufügen**
    - *Methode A – Befehlspalette (empfohlen)*
      1. `Ctrl+Shift+P` / `Cmd+Shift+P` öffnen.
      2. `MCP: Add Server` wählen.
      3. `HTTP` als Server-Typ auswählen.
      4. URL eintragen: `http://127.0.0.1:7337/mcp`.
      5. Falls kein globales Token gesetzt ist, unter *Advanced* optional `Authorization: Bearer <token>` ergänzen oder später das Tool `willi-mako.login` nutzen.
      6. Als Speicherort *Workspace Settings* oder *User Settings* wählen.
    - *Methode B – manuelle Konfiguration*
      1. `.vscode/mcp.json` im Projekt anlegen.
      2. Folgende Konfiguration einfügen (Bearer-Token optional ergänzen):

          ```json
          {
             "servers": {
                "willi-mako": {
                  "type": "http",
                  "url": "http://127.0.0.1:7337/mcp"
                }
             }
          }
          ```
2. **Agent-Modus verwenden**
    - Copilot Chat öffnen (`Ctrl+Alt+I` / `Cmd+Ctrl+I`).
    - *Agent Mode* wählen und über die Tool-Leiste die verfügbaren Willi-Mako Tools einsehen.
    - Optional `willi-mako.login` aufrufen, um Credentials zu speichern. Ohne Session-ID erstellt der Server automatisch eine Session und meldet sie im Response (`sessionId`).

#### Claude Desktop

1. Einstellungen öffnen → **Model Context Protocol**.
2. **Add Server** klicken und folgende Werte hinterlegen:
    - Type: `HTTP`
    - URL: `http://127.0.0.1:7337/mcp`
    - Optional: Header `Authorization: Bearer <token>` oder Basic Credentials (`email:password`).
3. Speichern und in einer neuen Unterhaltung über `@willi-mako.<tool>` interagieren. Bei Bedarf zuerst `willi-mako.login` aufrufen.
4. Die automatisch bereitgestellte Session-ID wird in Tool-Antworten mitgeliefert und kann für Folgefragen wiederverwendet werden.

#### ChatGPT (OpenAI)

1. **Settings → Integrations → Model Context Protocol** öffnen.
2. **Add HTTP Server** wählen und eintragen:
    - Name: `Willi-Mako`
    - Endpoint: `http://127.0.0.1:7337/mcp`
    - Optional `Authorization`-Header setzen (Bearer oder Basic). Ohne Header später `willi-mako.login` verwenden.
3. Server aktivieren und im Chat `@willi-mako.semantic-search` o. ä. nutzen.
4. Ergebnisse enthalten strukturierte Daten (`structuredContent`), inklusive Session-ID bei ad-hoc erstellten Sessions.

#### anythingLLM (Self-hosted)

1. In der Admin-Oberfläche zu **Integrations → MCP Servers** navigieren.
2. **Add Server** wählen und folgende Werte angeben:
    - Display Name: `Willi-Mako`
    - Server Type: `HTTP`
    - Server URL: `http://host.docker.internal:7337/mcp` (Docker) oder `http://127.0.0.1:7337/mcp` lokal.
    - Optional Authentication Header (Bearer oder Basic) hinzufügen.
3. Änderungen speichern und dem gewünschten Workspace den neuen MCP-Server zuweisen.
4. In Chat-Flows können Tools direkt per `@willi-mako.<tool>` aufgerufen werden; Responses beinhalten `structuredContent` mit Session- oder Job-Informationen.

#### n8n Automations

1. Falls nicht bereits geschehen, den MCP Server starten.
2. In n8n einen **HTTP Request** Node hinzufügen:
    - Methode: `POST`
    - URL: `http://127.0.0.1:7337/mcp`
    - Header `Content-Type: application/json`, `Accept: application/json, text/event-stream`, `MCP-Client-ID: n8n`
    - Body: JSON-RPC Request (z. B. `tools/list` oder `tools/call`).
3. Für Streaming-Antworten kann ein zweiter Node mit `GET` und `Accept: text/event-stream` genutzt werden, um SSE-Events zu verarbeiten.
4. Token-Handling: Entweder `Authorization`-Header setzen, Basic Credentials verwenden oder vorab das Tool `willi-mako.login` triggern und das zurückgelieferte Token in weiteren Nodes verwenden.
5. Die n8n Workflows aus Abschnitt „5. n8n Automations“ lassen sich direkt mit MCP kombinieren, indem JSON-RPC Calls als HTTP Requests formuliert werden.

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
- Für langfristige Workflows lässt sich das Dashboard-Skript (`src/demos/web-dashboard.ts`) als Basis nutzen und über die n8n *Webhook*-Nodes ansteuern.

---

## Weiterführende Ressourcen

- [`README.md`](../README.md) – Überblick & Quickstarts.
- [`src/demos/mcp-server.ts`](../src/demos/mcp-server.ts) – Vollständiger MCP Server mit Tools & Ressourcen.
- [`docs/API.md`](./API.md) – Endpunkte im Detail.
- [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) – Fehleranalyse & Logging.
- [`examples/`](../examples) – Weitere Skripte und Demos.

Bei Fragen oder Erweiterungswünschen: [dev@stromdao.com](mailto:dev@stromdao.com) oder GitHub-Issues.
