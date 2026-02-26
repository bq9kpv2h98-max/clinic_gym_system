/**
 * Atlassian Integration (Jira & Confluence)
 * 
 * Provides helper functions for integrating with Atlassian Cloud products.
 */

// ENV is not needed here - credentials are hardcoded from skill

// Atlassian credentials from skill
const ATLASSIAN_EMAIL = "kusakabe.bb.tk@gmail.com";
const ATLASSIAN_API_TOKEN = "ATATT3xFfGF0W8w_E98GXxO1TCwbxw5SzgCNFwHvllI2zdGi0qobcxZx_Khk-n34d9_b9ZdCn29BxfVOCfbtlG8D4NYxcv-rNUm3jPVCLszOvHLvOhmCAZCnkrF6KK6i_YP30ibRiSue0DpRnVLFClFGJ2lRLZvLX-fRhajkoAuhCqqdtbGlaTc=9C1E1E63";

// API endpoints
const JIRA_BASE_URL = "https://kusakabebbtk.atlassian.net/rest/api/3";
const CONFLUENCE_BASE_URL = "https://kusakabebbtk1.atlassian.net/wiki/rest/api";

// Confluence space key for backups
const CONFLUENCE_SPACE_KEY = "CLINIC";

/**
 * Create Basic Auth header
 */
function getAuthHeader(): string {
  const credentials = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString("base64");
  return `Basic ${credentials}`;
}

/**
 * Make HTTP request to Atlassian API
 */
async function makeRequest(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: getAuthHeader(),
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Atlassian API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Confluence Operations
// ============================================================================

/**
 * Search Confluence pages by title
 */
export async function searchConfluencePages(title: string): Promise<any[]> {
  const cql = `title ~ "${title}" AND space = ${CONFLUENCE_SPACE_KEY}`;
  const url = `${CONFLUENCE_BASE_URL}/content/search?cql=${encodeURIComponent(cql)}`;
  const result = await makeRequest(url);
  return result.results || [];
}

/**
 * Get Confluence page by ID
 */
export async function getConfluencePage(pageId: string): Promise<any> {
  const url = `${CONFLUENCE_BASE_URL}/content/${pageId}?expand=body.storage,version`;
  return makeRequest(url);
}

/**
 * Create Confluence page
 */
export async function createConfluencePage(
  title: string,
  content: string,
  parentId?: string
): Promise<any> {
  const body: any = {
    type: "page",
    title,
    space: { key: CONFLUENCE_SPACE_KEY },
    body: {
      storage: {
        value: content,
        representation: "storage",
      },
    },
  };

  if (parentId) {
    body.ancestors = [{ id: parentId }];
  }

  const url = `${CONFLUENCE_BASE_URL}/content`;
  return makeRequest(url, "POST", body);
}

/**
 * Update Confluence page
 */
export async function updateConfluencePage(
  pageId: string,
  title: string,
  content: string,
  currentVersion: number
): Promise<any> {
  const body = {
    version: { number: currentVersion + 1 },
    title,
    type: "page",
    body: {
      storage: {
        value: content,
        representation: "storage",
      },
    },
  };

  const url = `${CONFLUENCE_BASE_URL}/content/${pageId}`;
  return makeRequest(url, "PUT", body);
}

/**
 * Create or update Confluence page (upsert)
 */
export async function upsertConfluencePage(
  title: string,
  content: string,
  parentId?: string
): Promise<{ pageId: string; url: string; action: "created" | "updated" }> {
  // Search for existing page
  const existingPages = await searchConfluencePages(title);

  if (existingPages.length > 0) {
    // Update existing page
    const page = existingPages[0];
    const fullPage = await getConfluencePage(page.id);
    await updateConfluencePage(page.id, title, content, fullPage.version.number);
    return {
      pageId: page.id,
      url: `https://kusakabebbtk1.atlassian.net/wiki${page._links.webui}`,
      action: "updated",
    };
  } else {
    // Create new page
    const newPage = await createConfluencePage(title, content, parentId);
    return {
      pageId: newPage.id,
      url: `https://kusakabebbtk1.atlassian.net/wiki${newPage._links.webui}`,
      action: "created",
    };
  }
}

// ============================================================================
// Jira Operations
// ============================================================================

/**
 * Search Jira issues using JQL
 */
export async function searchJiraIssues(jql: string): Promise<any[]> {
  const url = `${JIRA_BASE_URL}/search?jql=${encodeURIComponent(jql)}`;
  const result = await makeRequest(url);
  return result.issues || [];
}

/**
 * Get Jira issue by key
 */
export async function getJiraIssue(issueKey: string): Promise<any> {
  const url = `${JIRA_BASE_URL}/issue/${issueKey}`;
  return makeRequest(url);
}

/**
 * Create Jira issue
 */
export async function createJiraIssue(
  projectKey: string,
  summary: string,
  description: string,
  issueType: string = "Task",
  priority?: "Highest" | "High" | "Medium" | "Low" | "Lowest"
): Promise<any> {
  const body: any = {
    fields: {
      project: { key: projectKey },
      summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: description,
              },
            ],
          },
        ],
      },
      issuetype: { name: issueType },
    },
  };

  if (priority) {
    body.fields.priority = { name: priority };
  }

  const url = `${JIRA_BASE_URL}/issue`;
  return makeRequest(url, "POST", body);
}

/**
 * Add comment to Jira issue
 */
export async function addJiraComment(issueKey: string, comment: string): Promise<any> {
  const body = {
    body: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: comment,
            },
          ],
        },
      ],
    },
  };

  const url = `${JIRA_BASE_URL}/issue/${issueKey}/comment`;
  return makeRequest(url, "POST", body);
}

/**
 * Get available transitions for Jira issue
 */
export async function getJiraTransitions(issueKey: string): Promise<any[]> {
  const url = `${JIRA_BASE_URL}/issue/${issueKey}/transitions`;
  const result = await makeRequest(url);
  return result.transitions || [];
}

/**
 * Transition Jira issue (change status)
 */
export async function transitionJiraIssue(issueKey: string, transitionId: string): Promise<void> {
  const body = {
    transition: { id: transitionId },
  };

  const url = `${JIRA_BASE_URL}/issue/${issueKey}/transitions`;
  await makeRequest(url, "POST", body);
}

/**
 * Close Jira issue (transition to Done)
 */
export async function closeJiraIssue(issueKey: string): Promise<void> {
  const transitions = await getJiraTransitions(issueKey);
  const doneTransition = transitions.find(
    (t) => t.name === "Done" || t.to.name === "Done"
  );

  if (doneTransition) {
    await transitionJiraIssue(issueKey, doneTransition.id);
  } else {
    throw new Error(`No "Done" transition found for issue ${issueKey}`);
  }
}
