/**
 * GENERATED: the production server card (`/.well-known/mcp/server-card.json`)
 * as of this release, used only when the live card cannot be fetched in no-key
 * preview mode. Regenerate from the API's server card when its tools change.
 */
import type { ServerCard } from "./types.js";

export const BUNDLED_SERVER_CARD: ServerCard = {
  serverInfo: {
    name: "com.nodes2cloud/mcp",
    title: "Nodes2Cloud",
    version: "2.0.0",
    description:
      "Build, validate and deploy automation workflows as Cloudflare Workers in your own Cloudflare account, with owner approval before agent deploys.",
    websiteUrl: "https://nodes2cloud.com",
    icons: [
      {
        src: "https://nodes2cloud.com/apple-touch-icon.png",
        mimeType: "image/png",
        sizes: ["180x180"],
      },
      {
        src: "https://nodes2cloud.com/nodes2cloud-mark.svg",
        mimeType: "image/svg+xml",
      },
    ],
  },
  instructions:
    "Nodes2Cloud compiles workflow graphs (JSON nodes and edges) into Cloudflare Workers and deploys them to the user's own Cloudflare account.\nTypical order: list_node_types and get_node_schemas (never guess property names) \u2192 create_workflow \u2192 validate_workflow \u2192 check_setup (fix missing connections with request_connections) \u2192 deploy_workflow \u2192 run_workflow to show a real result.\nDeploys usually wait for the owner to approve them in an open Nodes2Cloud browser tab; tell the user when one is waiting.\nNever ask the user to paste a secret or API key into the chat: use request_connections.\nErrors carry a `code`, and often `remediation` and `nextTool`: follow them.",
  documentation: "https://docs.nodes2cloud.com/docs/getting-started/mcp",
  transport: {
    type: "streamable-http",
    url: "https://api.nodes2cloud.com/mcp",
  },
  authentication: {
    required: true,
    schemes: ["oauth2", "bearer"],
    protectedResourceMetadata:
      "https://api.nodes2cloud.com/.well-known/oauth-protected-resource/mcp",
  },
  capabilities: {
    tools: {},
    prompts: {},
    resources: {},
  },
  tools: [
    {
      name: "list_workflows",
      title: "List workflows",
      description:
        "List the workflows this connection can access, personal and shared through a workspace, most recently updated first. Each entry has its id, name, status and live URL if deployed. Start here to find a workflowId. If the owner restricted this connection to certain workflows, only those are listed and every other id is refused.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      outputSchema: {
        type: "object",
        properties: {
          workflows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                name: {
                  type: "string",
                },
                status: {
                  type: "string",
                  enum: ["draft", "validated", "deployed", "paused", "archived"],
                },
                deployedWorkerUrl: {
                  type: "string",
                },
                updatedAt: {
                  type: "string",
                },
                ownerId: {
                  type: "string",
                },
                authoredVia: {
                  type: "string",
                  const: "mcp",
                },
                authoredViaClient: {
                  type: "string",
                },
              },
              required: ["id", "name", "status", "updatedAt", "ownerId"],
              additionalProperties: false,
            },
          },
        },
        required: ["workflows"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: false,
      },
      annotations: {
        title: "List workflows",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "get_workflow",
      title: "Get workflow",
      description:
        "Get one workflow's editable graph (nodes, edges, settings) and metadata, including the `updatedAt` value update_workflow requires. Pass `versionNumber` to instead get that deployed version's frozen graph together with the version before it (`previousVersion`, null for version 1), so you can see what changed; list_workflow_versions gives the numbers.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          versionNumber: {
            description:
              "A saved version to read instead of the current draft. Omit for the draft.",
            type: "integer",
            minimum: 1,
            maximum: 9007199254740991,
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
          },
          status: {
            type: "string",
            enum: ["draft", "validated", "deployed", "paused", "archived"],
          },
          deployedWorkerUrl: {
            type: "string",
          },
          updatedAt: {
            type: "string",
          },
          ownerId: {
            type: "string",
          },
          authoredVia: {
            type: "string",
            const: "mcp",
          },
          authoredViaClient: {
            type: "string",
          },
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                type: {
                  type: "string",
                },
              },
              required: ["id", "type"],
              additionalProperties: {},
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                source: {
                  type: "string",
                },
                target: {
                  type: "string",
                },
              },
              required: ["id", "source", "target"],
              additionalProperties: {},
            },
          },
          settings: {
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {},
          },
          createdAt: {
            type: "string",
          },
          version: {
            type: "object",
            properties: {
              versionNumber: {
                type: "number",
              },
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                    },
                    type: {
                      type: "string",
                    },
                  },
                  required: ["id", "type"],
                  additionalProperties: {},
                },
              },
              edges: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                    },
                    source: {
                      type: "string",
                    },
                    target: {
                      type: "string",
                    },
                  },
                  required: ["id", "source", "target"],
                  additionalProperties: {},
                },
              },
              settings: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {},
              },
            },
            required: ["versionNumber", "nodes", "edges", "settings"],
            additionalProperties: {},
          },
          previousVersion: {
            anyOf: [
              {
                type: "object",
                properties: {
                  versionNumber: {
                    type: "number",
                  },
                  nodes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                        },
                        type: {
                          type: "string",
                        },
                      },
                      required: ["id", "type"],
                      additionalProperties: {},
                    },
                  },
                  edges: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: {
                          type: "string",
                        },
                        source: {
                          type: "string",
                        },
                        target: {
                          type: "string",
                        },
                      },
                      required: ["id", "source", "target"],
                      additionalProperties: {},
                    },
                  },
                  settings: {
                    type: "object",
                    propertyNames: {
                      type: "string",
                    },
                    additionalProperties: {},
                  },
                },
                required: ["versionNumber", "nodes", "edges", "settings"],
                additionalProperties: {},
              },
              {
                type: "null",
              },
            ],
          },
        },
        required: ["id", "name", "status", "updatedAt", "ownerId"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Get workflow",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "create_workflow",
      title: "Create workflow",
      description:
        "Create a new, undeployed workflow, optionally with an initial graph. Look up node types with list_node_types and get_node_schemas first rather than guessing property names. Returns the saved workflow, including its id and `updatedAt`. Nothing runs or deploys until deploy_workflow. Refused when the plan's workflow limit is reached or this connection is restricted to existing workflows.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 200,
            description: "Human-readable workflow name.",
          },
          nodes: {
            description: "Initial nodes. Omit to start empty.",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  minLength: 1,
                },
                type: {
                  type: "string",
                  minLength: 1,
                },
                position: {
                  type: "object",
                  properties: {
                    x: {
                      type: "number",
                    },
                    y: {
                      type: "number",
                    },
                  },
                  required: ["x", "y"],
                },
                data: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {},
                },
              },
              required: ["id", "type", "position", "data"],
            },
          },
          edges: {
            description: "Initial edges between those nodes.",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  minLength: 1,
                },
                source: {
                  type: "string",
                  minLength: 1,
                },
                target: {
                  type: "string",
                  minLength: 1,
                },
                sourceHandle: {
                  type: "string",
                },
                targetHandle: {
                  type: "string",
                },
              },
              required: ["id", "source", "target"],
            },
          },
        },
        required: ["name"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
          },
          status: {
            type: "string",
            enum: ["draft", "validated", "deployed", "paused", "archived"],
          },
          deployedWorkerUrl: {
            type: "string",
          },
          updatedAt: {
            type: "string",
          },
          ownerId: {
            type: "string",
          },
          authoredVia: {
            type: "string",
            const: "mcp",
          },
          authoredViaClient: {
            type: "string",
          },
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                type: {
                  type: "string",
                },
              },
              required: ["id", "type"],
              additionalProperties: {},
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                source: {
                  type: "string",
                },
                target: {
                  type: "string",
                },
              },
              required: ["id", "source", "target"],
              additionalProperties: {},
            },
          },
          settings: {
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {},
          },
          createdAt: {
            type: "string",
          },
        },
        required: [
          "id",
          "name",
          "status",
          "updatedAt",
          "ownerId",
          "nodes",
          "edges",
          "settings",
          "createdAt",
        ],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Create workflow",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "update_workflow",
      title: "Update workflow",
      description:
        "Replace a workflow's saved draft: any of name, nodes and edges you pass overwrite the stored ones whole (send the complete node and edge lists, not a patch). Requires the `updatedAt` from your last get_workflow or create_workflow; if someone edited it since, this returns `conflict` and changes nothing, so re-read and retry. Does not touch what is deployed. Returns the saved workflow with its new `updatedAt`.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          name: {
            description: "New name. Omit to keep it.",
            type: "string",
            minLength: 1,
            maxLength: 200,
          },
          nodes: {
            description: "The complete new node list. Omit to keep the current nodes.",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  minLength: 1,
                },
                type: {
                  type: "string",
                  minLength: 1,
                },
                position: {
                  type: "object",
                  properties: {
                    x: {
                      type: "number",
                    },
                    y: {
                      type: "number",
                    },
                  },
                  required: ["x", "y"],
                },
                data: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {},
                },
              },
              required: ["id", "type", "position", "data"],
            },
          },
          edges: {
            description: "The complete new edge list. Omit to keep the current edges.",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  minLength: 1,
                },
                source: {
                  type: "string",
                  minLength: 1,
                },
                target: {
                  type: "string",
                  minLength: 1,
                },
                sourceHandle: {
                  type: "string",
                },
                targetHandle: {
                  type: "string",
                },
              },
              required: ["id", "source", "target"],
            },
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            pattern:
              "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            description: "The workflow's `updatedAt` exactly as last returned to you.",
          },
        },
        required: ["workflowId", "updatedAt"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
          },
          status: {
            type: "string",
            enum: ["draft", "validated", "deployed", "paused", "archived"],
          },
          deployedWorkerUrl: {
            type: "string",
          },
          updatedAt: {
            type: "string",
          },
          ownerId: {
            type: "string",
          },
          authoredVia: {
            type: "string",
            const: "mcp",
          },
          authoredViaClient: {
            type: "string",
          },
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                type: {
                  type: "string",
                },
              },
              required: ["id", "type"],
              additionalProperties: {},
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                source: {
                  type: "string",
                },
                target: {
                  type: "string",
                },
              },
              required: ["id", "source", "target"],
              additionalProperties: {},
            },
          },
          settings: {
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {},
          },
          createdAt: {
            type: "string",
          },
        },
        required: [
          "id",
          "name",
          "status",
          "updatedAt",
          "ownerId",
          "nodes",
          "edges",
          "settings",
          "createdAt",
        ],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Update workflow",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "validate_workflow",
      title: "Validate workflow",
      description:
        "Compile a workflow without deploying it and report every error, each with the node it concerns. Use it after every edit and before deploy_workflow. Checks the saved graph by workflowId, or an unsaved graph passed as nodes and edges (given with a workflowId, they replace the saved ones for this check only). Set includeCode to also get the generated Worker script and its metadata (target, bindings, size) to show the user.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          nodes: {
            description: "Nodes to check instead of the saved ones. Pass with edges.",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  minLength: 1,
                },
                type: {
                  type: "string",
                  minLength: 1,
                },
                position: {
                  type: "object",
                  properties: {
                    x: {
                      type: "number",
                    },
                    y: {
                      type: "number",
                    },
                  },
                  required: ["x", "y"],
                },
                data: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {},
                },
              },
              required: ["id", "type", "position", "data"],
            },
          },
          edges: {
            description: "Edges to check instead of the saved ones. Pass with nodes.",
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  minLength: 1,
                },
                source: {
                  type: "string",
                  minLength: 1,
                },
                target: {
                  type: "string",
                  minLength: 1,
                },
                sourceHandle: {
                  type: "string",
                },
                targetHandle: {
                  type: "string",
                },
              },
              required: ["id", "source", "target"],
            },
          },
          includeCode: {
            description:
              "Also return the compiled script and metadata when valid. Default false, to save tokens.",
            type: "boolean",
          },
        },
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          valid: {
            type: "boolean",
          },
          errors: {
            type: "array",
            items: {},
          },
          script: {
            type: "string",
          },
          metadata: {},
        },
        required: ["valid", "errors"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Validate workflow",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "deploy_workflow",
      title: "Deploy workflow",
      description:
        "Deploy a saved workflow to the user's own Cloudflare account, replacing any live version. The server recompiles the saved graph itself; no code you send is ever deployed. Save and validate first, and call check_setup early so missing connections are fixed in time. Unless the owner allowed this connection to deploy without asking, the call waits up to 90 seconds for the owner to approve it in an open Nodes2Cloud browser tab: tell the user to approve it there. Some protected connections need an extra approval each. Editing the workflow while approval is pending cancels the deploy. If a needed service is not connected and your client supports URL elicitation, you get `input_required` with a link and a `requestState`: show the link, wait, then retry with the same workflowId and that requestState. Returns the deployment id, version number and live URL.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          requestState: {
            description:
              "Only on a retry: the opaque requestState from a previous `input_required` answer to this same call. Never invent or edit one.",
            type: "string",
            maxLength: 4096,
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          deploymentId: {
            type: "string",
          },
          versionNumber: {
            type: "number",
          },
          url: {
            type: "string",
          },
          cron: {
            type: "string",
          },
          warnings: {
            type: "array",
            items: {},
          },
          warning: {
            type: "string",
          },
          setupGaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                },
                title: {
                  type: "string",
                },
                impact: {
                  type: "string",
                },
                url: {
                  type: "string",
                },
                steps: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                blocking: {
                  type: "boolean",
                },
              },
              required: ["code", "title", "impact", "url", "steps", "blocking"],
              additionalProperties: {},
            },
          },
          resultType: {
            type: "string",
            const: "input_required",
          },
          elicitation: {
            type: "object",
            properties: {
              mode: {
                type: "string",
                const: "url",
              },
              message: {
                type: "string",
              },
              url: {
                type: "string",
              },
              elicitationId: {
                type: "string",
              },
            },
            required: ["mode", "message", "url", "elicitationId"],
            additionalProperties: {},
          },
          requestState: {
            type: "string",
          },
          missingProviders: {
            type: "array",
            items: {
              type: "string",
            },
          },
          retryGuidance: {
            type: "string",
          },
        },
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Deploy workflow",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "archive_workflow",
      title: "Archive workflow",
      description:
        "Archive a workflow: it leaves the active list and can no longer be edited or deployed until the owner restores it in the Nodes2Cloud editor. Nothing is permanently deleted, and a version already deployed keeps running in the user's Cloudflare account. Only use this when the user asks to remove a workflow. Archiving twice is harmless.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
          },
          message: {
            type: "string",
          },
        },
        required: ["success", "message"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: false,
      },
      annotations: {
        title: "Archive workflow",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "list_connections",
      title: "List connections",
      description:
        "List the services the user has connected (Slack, Google, Stripe and so on), with each connection's id, provider, name, kind and status. Metadata only: no secret or token is ever returned. Put a connection's id in a node's credential field when building a workflow. To see only what one workflow still needs, use check_setup instead.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      outputSchema: {
        type: "object",
        properties: {
          connections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                provider: {
                  anyOf: [
                    {
                      type: "string",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                name: {
                  anyOf: [
                    {
                      type: "string",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                kind: {
                  anyOf: [
                    {
                      type: "string",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                status: {
                  anyOf: [
                    {
                      type: "string",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
                workspaceId: {
                  anyOf: [
                    {
                      type: "string",
                    },
                    {
                      type: "null",
                    },
                  ],
                },
              },
              required: ["id"],
              additionalProperties: {},
            },
          },
        },
        required: ["connections"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: false,
      },
      annotations: {
        title: "List connections",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "list_node_types",
      title: "List node types",
      description:
        "Search the catalogue of node types a workflow can use: triggers (webhook, schedule, email, agent tool), logic (if, switch, loop, wait, code) and integrations with third-party services. Returns each type's id, display name, description, category and group, without property schemas to keep it small. Filter with `name`, then call get_node_schemas for the exact types you will use. Needs no account data.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            description:
              "Case-insensitive substring matched against the type id and display name, e.g. 'slack'.",
            type: "string",
            maxLength: 100,
          },
        },
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                },
                displayName: {
                  type: "string",
                },
                description: {
                  type: "string",
                },
                category: {
                  type: "string",
                },
                group: {
                  type: "string",
                },
              },
              required: ["type", "displayName"],
              additionalProperties: {},
            },
          },
        },
        required: ["nodes"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: false,
      },
      annotations: {
        title: "List node types",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "get_node_schemas",
      title: "Get node schemas",
      description:
        "Get the full property schema of one or more node types: every property's key, type, options, default and whether it is required, plus input and output ports. Use it before writing a node's `data` so property names are exact rather than guessed. An unknown type comes back with an `error` entry instead of failing the call.",
      inputSchema: {
        type: "object",
        properties: {
          types: {
            minItems: 1,
            maxItems: 50,
            type: "array",
            items: {
              type: "string",
              minLength: 1,
              maxLength: 100,
            },
            description: "Exact type ids from list_node_types, e.g. ['webhook_trigger', 'if'].",
          },
        },
        required: ["types"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          schemas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                },
                schema: {},
                error: {
                  type: "string",
                },
              },
              required: ["type"],
              additionalProperties: {},
            },
          },
        },
        required: ["schemas"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: false,
      },
      annotations: {
        title: "Get node schemas",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "test_run_node",
      title: "Test run node",
      description:
        "Run one saved node on its own, for real, to check its configuration and connection, the way the editor's test button does. It makes the node's actual call to the third-party service, so a 'send' node really sends. With no upstream run, `{{ \u2026 }}` expressions are passed through as literal text; the result names any field that affected. To test with real data flowing between nodes, deploy and use run_workflow. Returns the node's raw output.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          nodeId: {
            type: "string",
            minLength: 1,
            description: "The node's id within the saved graph.",
          },
        },
        required: ["workflowId", "nodeId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      annotations: {
        title: "Test run node",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "check_setup",
      title: "Check setup",
      description:
        "Check whether the user can deploy right now and what is missing: whether Cloudflare is connected (including the one-time workers.dev subdomain step, which otherwise only fails after a deploy) and, given a workflowId, which services its nodes need that are not connected yet (`missingProviders`). Call it early, while building, so the user can fix setup in parallel. After request_connections, call it again with that sessionId to poll the user's progress: `connectionRequest.complete` turns true once they are done. Never returns a secret.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            description: "Also report which services this workflow still needs connected.",
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          sessionId: {
            description: "A sessionId from request_connections, to poll that request's progress.",
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
        },
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          ready: {
            type: "boolean",
          },
          cloudflare: {
            type: "object",
            properties: {
              connected: {
                type: "boolean",
              },
              workersDevSubdomain: {
                type: "boolean",
              },
              remediation: {
                type: "string",
              },
              remediationUrl: {
                type: "string",
              },
            },
            required: ["connected", "workersDevSubdomain"],
            additionalProperties: {},
          },
          providers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                provider: {
                  type: "string",
                },
                connected: {
                  type: "boolean",
                },
                credentialId: {
                  type: "string",
                },
              },
              required: ["provider", "connected"],
              additionalProperties: {},
            },
          },
          missingProviders: {
            type: "array",
            items: {
              type: "string",
            },
          },
          connectionRequest: {
            type: "object",
            properties: {
              sessionId: {
                type: "string",
              },
              providers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    provider: {
                      type: "string",
                    },
                    connected: {
                      type: "boolean",
                    },
                    credentialId: {
                      type: "string",
                    },
                  },
                  required: ["provider", "connected"],
                  additionalProperties: {},
                },
              },
              complete: {
                type: "boolean",
              },
              expiresAt: {
                type: "string",
              },
              workflowId: {
                type: "string",
              },
              mcpClientId: {
                type: "string",
              },
            },
            required: ["sessionId", "providers", "complete", "expiresAt"],
            additionalProperties: {},
          },
        },
        required: ["ready", "cloudflare", "providers", "missingProviders"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Check setup",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "request_connections",
      title: "Request connections",
      description:
        "Create one short link the user opens to connect the services you name, with one button per service. Use the ids from check_setup's `missingProviders`, plus `cloudflare` if it is not connected. You cannot create a connection yourself, and must never ask the user to paste a secret into the chat: give them this link instead. Then poll check_setup with the returned sessionId and continue once `connectionRequest.complete` is true. Returns sessionId, connectUrl and expiresAt.",
      inputSchema: {
        type: "object",
        properties: {
          providers: {
            minItems: 1,
            maxItems: 20,
            type: "array",
            items: {
              type: "string",
              minLength: 1,
              maxLength: 64,
            },
            description: 'Provider ids, e.g. ["google_gmail","slack","cloudflare"].',
          },
          workflowId: {
            description: "The workflow this is for, if any.",
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
        },
        required: ["providers"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
          },
          connectUrl: {
            type: "string",
          },
          providers: {
            type: "array",
            items: {
              type: "string",
            },
          },
          expiresAt: {
            type: "string",
          },
        },
        required: ["sessionId", "connectUrl", "providers", "expiresAt"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Request connections",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "run_workflow",
      title: "Run workflow",
      description:
        "Run a deployed workflow once, for real, with an optional JSON payload as its trigger input, and return what happened. A simple workflow answers with its HTTP status, duration and response body. A durable one (with a wait, delay, approval or sub-workflow) starts a run and returns its instanceId and status: follow it with get_run. Use it after deploying to show the user a real result. It runs in the user's Cloudflare account against their real services, so it has real effects, and Nodes2Cloud stores nothing about it. Counts toward this connection's daily limit on workflow calls.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          payload: {
            description: "JSON trigger input, as a webhook body would carry it. Defaults to {}.",
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {},
          },
          via: {
            description:
              "`auto` (default) calls the live trigger, or starts a durable run when the trigger's secret cannot be reproduced. `instance` always starts a durable run (durable workflows only).",
            type: "string",
            enum: ["auto", "instance"],
          },
          instanceId: {
            description:
              "Your own id for a durable run, so you can poll it with get_run. Implies via `instance`. Cannot start with 'cf_'.",
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          ok: {
            type: "boolean",
          },
          status: {
            anyOf: [
              {
                type: "number",
              },
              {
                type: "string",
              },
            ],
          },
          statusText: {
            type: "string",
          },
          durationMs: {
            type: "number",
          },
          body: {},
          curlCommand: {
            type: "string",
          },
          via: {
            type: "string",
            enum: ["http", "workflow_instance"],
          },
          instanceId: {
            type: "string",
          },
          note: {
            type: "string",
          },
          nextTool: {
            type: "string",
          },
        },
        required: ["via"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Run workflow",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "list_runs",
      title: "List runs",
      description:
        "List a deployed workflow's recent runs, newest first, read on demand from the user's own Cloudflare account. `source: history` (default) lists completed runs with an executionId, status and duration from the workflow's run log; it is empty until something has actually run. `source: instances` lists durable runs with an instanceId, including ones still queued, waiting or paused, and can filter by `status`. Pass the returned `cursor` back to get the next page. Open one run with get_run.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          source: {
            description:
              "`history` (default): the run log. `instances`: durable runs and their state.",
            type: "string",
            enum: ["history", "instances"],
          },
          status: {
            description: "Only with source `instances`: return runs in this state.",
            type: "string",
            enum: [
              "queued",
              "running",
              "paused",
              "errored",
              "terminated",
              "complete",
              "waitingForPause",
              "waiting",
              "rollingBack",
            ],
          },
          order: {
            description:
              "Only with source `history`. Default newest; oldest pages through all retained history.",
            type: "string",
            enum: ["newest", "oldest"],
          },
          limit: {
            description: "Runs per page, 1-100. Default 20.",
            type: "integer",
            minimum: 1,
            maximum: 100,
          },
          cursor: {
            description: "The cursor from the previous page, with the same source and order.",
            type: "string",
            minLength: 1,
            maxLength: 2048,
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          source: {
            type: "string",
            enum: ["history", "instances"],
          },
          runs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                executionId: {
                  type: "string",
                },
                startedAt: {
                  type: "string",
                },
                status: {
                  type: "string",
                  enum: ["success", "error"],
                },
                error: {
                  type: "string",
                },
                stepCount: {
                  type: "integer",
                  minimum: 0,
                  maximum: 9007199254740991,
                },
              },
              required: ["executionId", "startedAt", "status", "stepCount"],
              additionalProperties: false,
            },
          },
          instances: {
            type: "array",
            items: {
              type: "object",
              properties: {
                instanceId: {
                  type: "string",
                },
                status: {
                  type: "string",
                  enum: [
                    "queued",
                    "running",
                    "paused",
                    "errored",
                    "terminated",
                    "complete",
                    "waitingForPause",
                    "waiting",
                    "rollingBack",
                  ],
                },
                versionId: {
                  type: "string",
                },
                triggerSource: {
                  type: "string",
                },
                createdOn: {
                  type: "string",
                },
                startedOn: {
                  type: "string",
                },
                endedOn: {
                  type: "string",
                },
              },
              required: ["instanceId", "status"],
              additionalProperties: false,
            },
          },
          cursor: {
            type: "string",
          },
          truncated: {
            type: "boolean",
          },
          nextTool: {
            type: "string",
          },
        },
        required: ["source"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "List runs",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "get_run",
      title: "Get run",
      description:
        "Get one run's details. Pass `executionId` (from list_runs source history) for step-by-step status, durations and recorded inputs and outputs. Pass `instanceId` (from run_workflow or list_runs source instances) for a durable run's state, step history, output and error, plus `awaitingEvents`: the event types it is parked on, which control_run send_event must use. Pass exactly one of the two. Set `simple` with instanceId to get only the status, for cheap polling.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          executionId: {
            description: "A run-log id from list_runs (source history).",
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          instanceId: {
            description: "A durable run's id from run_workflow or list_runs (source instances).",
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
          simple: {
            description: "With instanceId only: skip step detail and return status and stepCount.",
            type: "boolean",
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          source: {
            type: "string",
            enum: ["history", "instance"],
          },
          executionId: {
            type: "string",
          },
          instanceId: {
            type: "string",
          },
          status: {
            type: "string",
          },
          startedAt: {
            type: "string",
          },
          steps: {
            type: "array",
            items: {},
          },
          stepCount: {
            type: "number",
          },
          output: {},
          error: {},
          awaitingEvents: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: ["source", "status"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Get run",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "control_run",
      title: "Control run",
      description:
        "Act on one in-flight durable run: `pause`, `resume`, `terminate` (stops it where it is; completed steps are not undone), or `send_event` to deliver an event to a run parked on a wait or approval, resuming it. For send_event, read get_run first and use one of its `awaitingEvents` as `eventType`: Cloudflare accepts any type, so a wrong one silently does nothing. To run a workflow again from the start, use run_workflow; replaying from a step is not offered because it would repeat effects that already happened.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          instanceId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The durable run's id.",
          },
          action: {
            type: "string",
            enum: ["pause", "resume", "terminate", "send_event"],
          },
          eventType: {
            description: "Required for send_event: one of the run's awaitingEvents, exactly.",
            type: "string",
            minLength: 1,
            maxLength: 128,
          },
          payload: {
            description: "send_event only: JSON delivered to the waiting node.",
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {},
          },
        },
        required: ["workflowId", "instanceId", "action"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          instanceId: {
            type: "string",
          },
          action: {
            type: "string",
            enum: ["pause", "resume", "terminate", "send_event"],
          },
          status: {
            type: "string",
            enum: [
              "queued",
              "running",
              "paused",
              "errored",
              "terminated",
              "complete",
              "waitingForPause",
              "waiting",
              "rollingBack",
            ],
          },
          timestamp: {
            type: "string",
          },
          eventType: {
            type: "string",
          },
          delivered: {
            type: "boolean",
          },
          note: {
            type: "string",
          },
          nextTool: {
            type: "string",
          },
        },
        required: ["instanceId", "action"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Control run",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "get_deployment_status",
      title: "Get deployment status",
      description:
        "Answer 'is this deployed workflow healthy, and is it still what we deployed?' in one call. `stats`: run counts, error rates and p50/p95 durations per node type from the workflow's own telemetry. `health`: Cloudflare's independent count of invocations, errors and CPU time, which also catches failures the telemetry cannot see. `drift`: whether the deployed script still exists in the user's Cloudflare account (catching one deleted by hand) and, with GitHub sync, how far the mirror is behind; plan-gated. Each section answers on its own: one that cannot be read carries an `error` and is listed in `warnings`, and the rest still return. Read each section's `caveats` before concluding. For raw log lines use get_deployment_logs.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          since: {
            description: "Time window for stats and health. Default 24h.",
            type: "string",
            enum: ["1h", "24h", "7d", "30d"],
          },
          include: {
            description: "Sections to read. Default all three; fewer is faster.",
            minItems: 1,
            type: "array",
            items: {
              type: "string",
              enum: ["stats", "health", "drift"],
            },
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          stats: {
            type: "object",
            properties: {
              runsSeen: {
                type: "number",
              },
              stepErrorRate: {
                type: "number",
              },
              byNodeType: {
                type: "array",
                items: {},
              },
              caveats: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              error: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                  },
                  message: {
                    type: "string",
                  },
                  remediation: {
                    type: "string",
                  },
                },
                required: ["code", "message"],
                additionalProperties: {},
              },
            },
            additionalProperties: {},
          },
          health: {
            type: "object",
            properties: {
              invocations: {},
              caveats: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              error: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                  },
                  message: {
                    type: "string",
                  },
                  remediation: {
                    type: "string",
                  },
                },
                required: ["code", "message"],
                additionalProperties: {},
              },
            },
            additionalProperties: {},
          },
          drift: {
            type: "object",
            properties: {
              status: {
                type: "string",
              },
              error: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                  },
                  message: {
                    type: "string",
                  },
                  remediation: {
                    type: "string",
                  },
                },
                required: ["code", "message"],
                additionalProperties: {},
              },
            },
            additionalProperties: {},
          },
          warnings: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: ["warnings"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Get deployment status",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "get_deployment_logs",
      title: "Get deployment logs",
      description:
        "Read the raw log lines and uncaught exceptions a deployed workflow produced in the user's Cloudflare account, newest first. Use it when a run failed without explanation, or get_deployment_status shows errors you need to see. `source` in the answer says which log store responded; null means neither had anything for this window, which is not an error.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          since: {
            description: "Time window. Default 24h.",
            type: "string",
            enum: ["1h", "24h", "7d", "30d"],
          },
          limit: {
            description: "Lines to return, 1-100. Default 50.",
            type: "integer",
            minimum: 1,
            maximum: 100,
          },
          source: {
            description:
              "Force one store: Cloudflare Workers Logs, or the workflow's own log forwarder. Default tries the first, then the second.",
            type: "string",
            enum: ["workers_logs", "tail"],
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
          },
          scriptName: {
            type: "string",
          },
          since: {
            type: "string",
            enum: ["1h", "24h", "7d", "30d"],
          },
          source: {
            anyOf: [
              {
                type: "string",
                enum: ["workers_logs", "tail"],
              },
              {
                type: "null",
              },
            ],
          },
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp: {
                  type: "string",
                },
                level: {
                  type: "string",
                },
                message: {
                  type: "string",
                },
                requestId: {
                  type: "string",
                },
                outcome: {
                  type: "string",
                },
              },
              additionalProperties: false,
            },
          },
          rowsRead: {
            type: "number",
          },
          unavailable: {
            type: "object",
            properties: {
              code: {
                type: "string",
              },
              message: {
                type: "string",
              },
              remediation: {
                type: "string",
              },
            },
            required: ["code", "message", "remediation"],
            additionalProperties: false,
          },
          caveats: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: ["workflowId", "scriptName", "since", "source", "lines", "caveats"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Get deployment logs",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "list_workflow_versions",
      title: "List workflow versions",
      description:
        "List one workflow's deployed versions, newest first, marking which one is live now. Every deploy creates a version. Use the version numbers with get_workflow (to read or compare a version's graph) and rollback_workflow (to make an earlier one live again).",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          versions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                workflowId: {
                  type: "string",
                },
                versionNumber: {
                  type: "integer",
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991,
                },
                compiledScriptHash: {
                  type: "string",
                },
                cfVersionId: {
                  type: "string",
                },
                createdAt: {
                  type: "string",
                },
                isLive: {
                  type: "boolean",
                },
                githubCommitSha: {
                  type: "string",
                },
                githubPushStatus: {
                  type: "string",
                  enum: ["pushed", "failed", "superseded"],
                },
                githubPushedAt: {
                  type: "string",
                },
                githubPushError: {
                  type: "string",
                },
              },
              required: ["id", "workflowId", "versionNumber", "compiledScriptHash", "createdAt"],
              additionalProperties: false,
            },
          },
        },
        required: ["versions"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: false,
      },
      annotations: {
        title: "List workflow versions",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "rollback_workflow",
      title: "Roll back workflow",
      description:
        "Make an earlier deployed version of a workflow live again in the user's Cloudflare account, replacing what is running now. Get version numbers from list_workflow_versions. Only do this when the user asks. Refused if the owner turned off deploys for this connection. For a durable workflow, the answer warns about runs the outgoing version left in flight. Set restoreDraft to also load that version back as the editable draft.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          versionNumber: {
            type: "integer",
            minimum: 1,
            maximum: 9007199254740991,
            description: "The version to make live, from list_workflow_versions.",
          },
          restoreDraft: {
            description:
              "Also replace the editable draft with this version's graph. Default false.",
            type: "boolean",
          },
        },
        required: ["workflowId", "versionNumber"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          deploymentId: {
            type: "string",
          },
          versionNumber: {
            type: "number",
          },
          url: {
            type: "string",
          },
          cron: {
            type: "string",
          },
          warnings: {
            type: "array",
            items: {},
          },
          warning: {
            type: "string",
          },
          setupGaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                },
                title: {
                  type: "string",
                },
                impact: {
                  type: "string",
                },
                url: {
                  type: "string",
                },
                steps: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                blocking: {
                  type: "boolean",
                },
              },
              required: ["code", "title", "impact", "url", "steps", "blocking"],
              additionalProperties: {},
            },
          },
          resultType: {
            type: "string",
            const: "input_required",
          },
          elicitation: {
            type: "object",
            properties: {
              mode: {
                type: "string",
                const: "url",
              },
              message: {
                type: "string",
              },
              url: {
                type: "string",
              },
              elicitationId: {
                type: "string",
              },
            },
            required: ["mode", "message", "url", "elicitationId"],
            additionalProperties: {},
          },
          requestState: {
            type: "string",
          },
          missingProviders: {
            type: "array",
            items: {
              type: "string",
            },
          },
          retryGuidance: {
            type: "string",
          },
        },
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Roll back workflow",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "list_workflow_files",
      title: "List workflow files",
      description:
        "List the files a deployed workflow's runs have stored in its own storage bucket in the user's Cloudflare account, with each file's key, size and last-modified time. `readPath` is the URL template that downloads one file. A workflow that never stored a file returns an empty list, not an error. Pass `cursor` back for the next page.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          limit: {
            description: "Files per page, 1-1000. Default 100.",
            type: "integer",
            minimum: 1,
            maximum: 1000,
          },
          cursor: {
            description: "The cursor from the previous page.",
            type: "string",
            minLength: 1,
            maxLength: 2048,
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: {
                  type: "string",
                },
              },
              additionalProperties: {},
            },
          },
          cursor: {
            type: "string",
          },
          readPath: {
            type: "string",
          },
        },
        required: ["files", "readPath"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "List workflow files",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "verify_connection",
      title: "Verify connection",
      description:
        "Check a saved connection against its provider right now (a read-only identity call) and record the result. Use it when a node fails with what looks like an authentication error: access that worked when it was saved may since have been revoked or narrowed. Returns the connection's metadata with its new status, never the secret. Some providers cannot be checked on their own, and neither can a connection under the owner's extra passkey protection; both answer `not_eligible`.",
      inputSchema: {
        type: "object",
        properties: {
          credentialId: {
            type: "string",
            minLength: 1,
            description: "The connection's id, from list_connections or check_setup.",
          },
        },
        required: ["credentialId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          kind: {
            type: "string",
            enum: [
              "api_token",
              "oauth",
              "api_key",
              "oauth2",
              "basic",
              "header",
              "connection_string",
              "service_account",
            ],
          },
          scopes: {
            type: "array",
            items: {
              type: "string",
            },
          },
          provider: {
            type: "string",
          },
          name: {
            type: "string",
          },
          accountEmail: {
            type: "string",
          },
          cloudflareAccountId: {
            type: "string",
          },
          expiresAt: {
            type: "string",
          },
          createdAt: {
            type: "string",
          },
          workspaceId: {
            type: "string",
          },
          wrapMethod: {
            type: "string",
            enum: ["webauthn_prf", "passphrase_kdf"],
          },
          scopeWarning: {
            type: "string",
          },
          cloudflareWorkersPlan: {
            type: "string",
            enum: ["free", "paid"],
          },
          probedZonePlanTier: {
            type: "string",
          },
          lastProbedAt: {
            type: "string",
          },
          probeStatus: {
            type: "string",
            enum: ["unknown", "valid", "invalid", "error"],
          },
          probeError: {
            type: "string",
          },
        },
        required: ["id", "kind", "scopes", "createdAt"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Verify connection",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "rotate_webhook_secret",
      title: "Rotate webhook secret",
      description:
        "Generate a new secret for a deployed workflow's webhook trigger, redeploy it, and return the new secret. This immediately breaks anything still calling the webhook with the old secret, so only do it when the user asks or needs the secret to call the webhook themselves. The new secret takes a few seconds to go live: treat a single 401 right afterwards as propagation delay, wait and retry, and do not rotate again. Refused if the owner turned off deploys for this connection.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
        },
        required: ["workflowId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          ok: {
            type: "boolean",
          },
          webhookSecrets: {
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["ok"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Rotate webhook secret",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "get_plan",
      title: "Get plan and limits",
      description:
        "Read the user's plan and its limits: how many workflows may be saved and live at once, how many deployed workflows can be offered to agents as tools, and which features are included. Also lists each shared workspace's own limits, since a workflow's limits come from its owner's plan. Check this before telling the user something is impossible: a refusal is often a plan limit, not a bug.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      outputSchema: {
        type: "object",
        properties: {
          personal: {
            type: "object",
            properties: {
              tier: {
                type: "string",
                enum: ["free", "pro", "team", "enterprise", "maintenance"],
              },
              maxWorkflows: {
                type: "integer",
                exclusiveMinimum: 0,
                maximum: 9007199254740991,
              },
              maxTotalWorkflows: {
                type: "integer",
                exclusiveMinimum: 0,
                maximum: 9007199254740991,
              },
              maxVersionsPerWorkflow: {
                type: "integer",
                exclusiveMinimum: 0,
                maximum: 9007199254740991,
              },
              maxExposedTools: {
                type: "integer",
                exclusiveMinimum: 0,
                maximum: 9007199254740991,
              },
              marketplace: {
                type: "boolean",
              },
              collab: {
                type: "boolean",
              },
              sharedCredentials: {
                type: "boolean",
              },
              auditLog: {
                type: "boolean",
              },
              mcp: {
                type: "boolean",
              },
              mcpAutoMode: {
                type: "boolean",
              },
              githubSync: {
                type: "boolean",
              },
              aiCreditsPerMonth: {
                type: "number",
                minimum: 0,
              },
            },
            required: [
              "tier",
              "marketplace",
              "collab",
              "sharedCredentials",
              "auditLog",
              "mcp",
              "mcpAutoMode",
              "githubSync",
              "aiCreditsPerMonth",
            ],
            additionalProperties: {},
          },
          workspaces: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ownerId: {
                  type: "string",
                },
                limits: {
                  type: "object",
                  properties: {
                    tier: {
                      type: "string",
                    },
                  },
                  required: ["tier"],
                  additionalProperties: {},
                },
              },
              required: ["ownerId", "limits"],
              additionalProperties: {},
            },
          },
        },
        required: ["personal", "workspaces"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Get plan and limits",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "get_dynamic_options",
      title: "Get dynamic options",
      description:
        "Ask a connected service which values really exist, such as a spreadsheet's tab names, an Airtable base's tables and typed fields, a Typeform's questions or a Google account's calendars. Use it while configuring a node instead of guessing a name: a guessed tab or field deploys fine and only fails later on the user's real data. Read-only. Returns `options` (label and value pairs) or, for field pickers, `fields` with types and allowed values.",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The workflow's id, from list_workflows or create_workflow.",
          },
          loader: {
            type: "string",
            enum: [
              "airtableTableSchema",
              "listAirtableBases",
              "listAirtableTables",
              "listCalendars",
              "listDiscordChannels",
              "listDiscordGuilds",
              "listSalesforceObjects",
              "listSheetColumns",
              "listSheetTabs",
              "listSupabaseTables",
              "listTypeformFields",
              "salesforceDescribe",
              "supabaseTableSchema",
            ],
            description: "Which picker to run.",
          },
          credentialId: {
            type: "string",
            minLength: 1,
            description:
              "A credential for the loader's provider \u2014 check_setup reports what is connected.",
          },
          params: {
            description:
              "Loader-specific selectors, e.g. { spreadsheetId }, { baseId, tableId }, { sobject }.",
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["workflowId", "loader", "credentialId"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                },
                value: {
                  type: "string",
                },
              },
              required: ["label", "value"],
              additionalProperties: false,
            },
          },
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                },
                label: {
                  type: "string",
                },
                type: {
                  type: "string",
                },
                nillable: {
                  type: "boolean",
                },
                picklistValues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      value: {
                        type: "string",
                      },
                      label: {
                        type: "string",
                      },
                    },
                    required: ["value", "label"],
                    additionalProperties: false,
                  },
                },
                hint: {
                  type: "string",
                },
              },
              required: ["name", "label", "type"],
              additionalProperties: false,
            },
          },
        },
        required: ["options"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Get dynamic options",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "call_deployed_workflow",
      title: "Call deployed workflow",
      description:
        "Call one of the user's deployed agent-tool workflows (those with an MCP Tool trigger) by its tool name or workflow id, with the arguments its schema declares. Use it when the workflow is not in your tool list: one deployed since you connected only appears there after you reconnect, but is callable here at once. It runs for real in the user's Cloudflare account and counts toward this connection's daily limit on workflow calls. list_deployed_tools shows what is callable and the arguments each takes.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "The tool name from the workflow's MCP Tool trigger, or the workflow id.",
          },
          arguments: {
            description: "Arguments matching that tool's schema, from list_deployed_tools.",
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {},
          },
        },
        required: ["name"],
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      outputSchema: {
        type: "object",
        properties: {
          ok: {
            type: "boolean",
          },
          status: {
            type: "number",
          },
          statusText: {
            type: "string",
          },
          durationMs: {
            type: "number",
          },
          body: {},
          curlCommand: {
            type: "string",
          },
        },
        required: ["ok", "status", "statusText", "durationMs"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "Call deployed workflow",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
    {
      name: "list_deployed_tools",
      title: "List deployed tools",
      description:
        "List the user's deployed workflows that agents can call as tools right now (those deployed with an MCP Tool trigger), each with its tool name, description and argument schema. Use it to find a workflow deployed after you connected, then call it with call_deployed_workflow. If the plan's limit hides some, the answer says how many.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      outputSchema: {
        type: "object",
        properties: {
          tools: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                },
              },
              additionalProperties: {},
            },
          },
          truncated: {
            type: "number",
          },
          note: {
            type: "string",
          },
        },
        required: ["tools"],
        $schema: "http://json-schema.org/draft-07/schema#",
        additionalProperties: {},
      },
      annotations: {
        title: "List deployed tools",
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: {
        taskSupport: "forbidden",
      },
    },
  ],
  prompts: [
    {
      name: "webhook-to-slack",
      title: "Webhook \u2192 Slack",
      description: "Receive a webhook and post a formatted message to a Slack channel.",
    },
    {
      name: "scheduled-report",
      title: "Scheduled report",
      description: "On a schedule, fetch data from an API and email or post a summary.",
    },
    {
      name: "email-to-sheet",
      title: "Email \u2192 spreadsheet row",
      description: "When an email arrives, extract fields and append a row to Google Sheets.",
    },
    {
      name: "agent-callable-tool",
      title: "A tool I can call from this chat",
      description:
        "Build a workflow exposed as an MCP tool, so you can call it yourself afterwards.",
    },
    {
      name: "approve-before-acting",
      title: "Ask me before it acts",
      description: "A workflow that pauses for a human decision before doing anything risky.",
    },
    {
      name: "sync-two-apps",
      title: "Keep two apps in sync",
      description: "Poll or receive from one service and mirror records into another.",
    },
    {
      name: "ai-classify-and-route",
      title: "Classify with AI, then route",
      description: "Use a model to categorise an incoming item and branch on the result.",
    },
    {
      name: "file-processing",
      title: "Process an uploaded file",
      description: "Accept a file, transform it, and store or forward the result.",
    },
  ],
  resources: [],
  resourceTemplates: [
    {
      name: "node-schema",
      title: "Node schema",
      uriTemplate: "n2c://nodes/{type}",
      description:
        "The full property schema for one node type. Identical content to `get_node_schemas` for a single type, addressable by URI so a client can cache it instead of re-receiving it every conversation.",
      mimeType: "application/json",
    },
    {
      name: "compiled-workflow",
      title: "Compiled workflow script",
      uriTemplate: "n2c://workflows/{id}/compiled",
      description:
        "The JavaScript a saved workflow compiles to, in browser-preview mode (no telemetry instrumentation) \u2014 byte-identical to what `validate_workflow` with `includeCode` returns for the same graph. Read-only; reading this never deploys anything.",
      mimeType: "text/javascript",
    },
  ],
};
