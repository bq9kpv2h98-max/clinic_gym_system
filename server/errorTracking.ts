/**
 * Error Tracking and Jira Integration
 * 
 * Provides functions for tracking system errors and creating Jira tickets automatically.
 */

import { createJiraIssue, addJiraComment } from "./atlassian";

// Jira project key for system errors
const JIRA_PROJECT_KEY = "CLINIC";

/**
 * Track error and create Jira ticket
 */
export async function trackError(
  errorType: string,
  errorMessage: string,
  errorDetails?: any,
  priority?: "Highest" | "High" | "Medium" | "Low" | "Lowest"
): Promise<{ success: boolean; issueKey?: string; error?: string }> {
  try {
    const summary = `[${errorType}] ${errorMessage}`;
    const description = formatErrorDescription(errorType, errorMessage, errorDetails);

    const issue = await createJiraIssue(
      JIRA_PROJECT_KEY,
      summary,
      description,
      "Bug",
      priority || "High"
    );

    console.log(`Jira ticket created: ${issue.key}`);

    return {
      success: true,
      issueKey: issue.key,
    };
  } catch (error) {
    console.error("Failed to create Jira ticket:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format error description for Jira
 */
function formatErrorDescription(
  errorType: string,
  errorMessage: string,
  errorDetails?: any
): string {
  let description = `エラータイプ: ${errorType}\n\n`;
  description += `エラーメッセージ: ${errorMessage}\n\n`;

  if (errorDetails) {
    description += `詳細情報:\n`;
    if (typeof errorDetails === "object") {
      description += JSON.stringify(errorDetails, null, 2);
    } else {
      description += String(errorDetails);
    }
  }

  description += `\n\n発生日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`;

  return description;
}

/**
 * Track cron job error
 */
export async function trackCronJobError(
  jobName: string,
  errorMessage: string,
  errorDetails?: any
): Promise<{ success: boolean; issueKey?: string }> {
  const result = await trackError(
    "Cron Job Error",
    `${jobName}: ${errorMessage}`,
    errorDetails,
    "High"
  );

  return result;
}

/**
 * Track Notion sync error
 */
export async function trackNotionSyncError(
  syncType: string,
  errorMessage: string,
  errorDetails?: any
): Promise<{ success: boolean; issueKey?: string }> {
  const result = await trackError(
    "Notion Sync Error",
    `${syncType}: ${errorMessage}`,
    errorDetails,
    "High"
  );

  return result;
}

/**
 * Track database error
 */
export async function trackDatabaseError(
  operation: string,
  errorMessage: string,
  errorDetails?: any
): Promise<{ success: boolean; issueKey?: string }> {
  const result = await trackError(
    "Database Error",
    `${operation}: ${errorMessage}`,
    errorDetails,
    "Highest"
  );

  return result;
}

/**
 * Track API error
 */
export async function trackAPIError(
  endpoint: string,
  errorMessage: string,
  errorDetails?: any
): Promise<{ success: boolean; issueKey?: string }> {
  const result = await trackError(
    "API Error",
    `${endpoint}: ${errorMessage}`,
    errorDetails,
    "Medium"
  );

  return result;
}
