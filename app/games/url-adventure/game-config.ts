export type Level = {
  id: number;
  title: string;
  description: string;
  hint: string;
  path?: string[]; // Expected path segments after /games/url-adventure
  queryParams?: Record<string, string>; // Expected query params
  validation?: (path: string[], params: URLSearchParams) => boolean;
};

export const levels: Level[] = [
  {
    id: 1,
    title: "The Address Bar",
    description: "Welcome, Hacker. Your first task is simple. Navigate to the start.",
    hint: "Look at the URL. Change 'intro' to 'start'.",
    path: ["start"],
  },
  {
    id: 2,
    title: "Key Access",
    description: "The door is locked. You need a key.",
    hint: "Add a query parameter: ?item=key",
    validation: (_, params) => params.get("item") === "key",
  },
  {
    id: 3,
    title: "The Golden Ticket",
    description: "A rusty key won't work here. We need something more valuable.",
    hint: "Gold is better than iron. Change the key type.",
    validation: (_, params) => params.get("item") === "gold_key",
  },
  {
    id: 4,
    title: "Secret Agent",
    description: "Identity verification required.",
    hint: "Who are you? The URL needs to know your 'agent_id'. It's usually a number like 007.",
    validation: (_, params) => params.get("agent_id") === "007",
  },
  {
    id: 5,
    title: "Encoded Message",
    description: "The system only accepts encoded commands.",
    hint: "The command is 'open'. But you must encoded it in Base64 in the path. /games/url-adventure/level5/[base64]",
    validation: (path) => {
        // level5 is path[0], so we check path[1]
        // This validation assumes the user is navigating to something like /level5/b3Blbg==
        if (path.length < 2) return false;
        try {
            return atob(path[1]) === "open";
        } catch {
            return false;
        }
    }
  },
  {
      id: 6,
      title: "Query Confusion",
      description: "Filters are malfunctioning.",
      hint: "We need 'status' to be 'active' AND 'admin' to be 'true'.",
      validation: (_, params) => params.get("status") === "active" && params.get("admin") === "true"
  },
  {
      id: 7,
      title: "The Final Path",
      description: "You are almost there. Enter the hidden directory.",
      hint: "Go to /hidden/treasure",
      path: ["hidden", "treasure"]
  }
];

export const getLevelStatus = (
  currentPath: string[],
  currentParams: URLSearchParams,
  currentLevelId: number
): { completed: boolean; nextLevel?: Level } => {
  const level = levels.find((l) => l.id === currentLevelId);
  if (!level) return { completed: false };

  // Check path if defined
  if (level.path) {
    // Exact path matching
    const pathMatch = level.path.length === currentPath.length && level.path.every((segment, i) => currentPath[i] === segment);
    
    // If we have strict path requirements and they aren't met, return false
    if (!pathMatch && !level.validation && !level.queryParams) return { completed: false };
    
    // If path matches and no other requirements, complete!
    if (pathMatch && !level.queryParams && !level.validation) return { completed: true, nextLevel: levels.find(l => l.id === currentLevelId + 1) };
  }

  // Check params if defined
  if (level.queryParams) {
      for (const [key, value] of Object.entries(level.queryParams)) {
          if (currentParams.get(key) !== value) return { completed: false };
      }
      // If params match and no validation function, complete!
      if (!level.validation && !level.path) return { completed: true, nextLevel: levels.find(l => l.id === currentLevelId + 1) };
  }

  // Custom validation
  if (level.validation) {
      if (level.validation(currentPath, currentParams)) {
          return { completed: true, nextLevel: levels.find(l => l.id === currentLevelId + 1) };
      }
  }
  
  // Mixed cases (e.g. path matches AND params match)
  if (level.path && level.queryParams) {
       const pathMatches = level.path.length === currentPath.length && level.path.every((segment, i) => currentPath[i] === segment);
       let paramsMatch = true;
       for (const [key, value] of Object.entries(level.queryParams)) {
          if (currentParams.get(key) !== value) paramsMatch = false;
       }
       if (pathMatches && paramsMatch) return { completed: true, nextLevel: levels.find(l => l.id === currentLevelId + 1) };
  }

  return { completed: false };
};