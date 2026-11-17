export interface RemoteDesktopCommanderPermission {
  id: string; title: string; scopes: readonly string[]; readOnlyHint: boolean;
}

export const REMOTE_DESKTOP_COMMANDER_TOOL_PERMISSIONS: readonly RemoteDesktopCommanderPermission[] = [
  {
    "id": "list_devices",
    "title": "List authorized devices",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "who_am_i",
    "title": "View connected account",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "get_tool_result",
    "title": "Read a tool result",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "list_remote_tool_calls",
    "title": "List recent remote tool calls",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "shutdown",
    "title": "Disconnect a remote device",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "get_config",
    "title": "Read configuration",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "set_config_value",
    "title": "Update configuration",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "read_file",
    "title": "Read a file",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "read_multiple_files",
    "title": "Read multiple files",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "write_file",
    "title": "Write a file",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "write_pdf",
    "title": "Create a PDF",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "create_directory",
    "title": "Create a directory",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "list_directory",
    "title": "List directory contents",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "move_file",
    "title": "Move a file",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "start_search",
    "title": "Search authorized files",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "get_more_search_results",
    "title": "Read more search results",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "stop_search",
    "title": "Stop a search",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "list_searches",
    "title": "List searches",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "get_file_info",
    "title": "Read file metadata",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "edit_block",
    "title": "Edit a file block",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "start_process",
    "title": "Start a process",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "read_process_output",
    "title": "Read process output",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "interact_with_process",
    "title": "Interact with a process",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "force_terminate",
    "title": "Force-terminate a process",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "list_sessions",
    "title": "List process sessions",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "list_processes",
    "title": "List processes",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "kill_process",
    "title": "Stop a process",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": false
  },
  {
    "id": "get_usage_stats",
    "title": "Read usage statistics",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  },
  {
    "id": "get_recent_tool_calls",
    "title": "Read recent tool activity",
    "scopes": [
      "mcp:tools",
      "desktop:auth"
    ],
    "readOnlyHint": true
  }
] as const;
