import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const NOTION_RESERVATION_DATA_SOURCE_ID = "collection://2c7fc32c-8e8e-8168-b217-000bd01e5ca4";
const NOTION_CUSTOMER_DATA_SOURCE_ID = "collection://831da4b6-32a1-491d-84eb-4e1fdaa36f3e";

/**
 * Notion予約データベースから予約情報を検索
 * @param customerPhone 顧客の電話番号
 * @returns Notion予約データ
 */
export async function searchNotionReservations(customerPhone: string) {
  try {
    const searchQuery = customerPhone;
    const command = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
      query: searchQuery,
      query_type: "internal",
      data_source_url: NOTION_RESERVATION_DATA_SOURCE_ID,
    })}'`;

    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
    
    return result;
  } catch (error) {
    console.error("Notion search error:", error);
    return null;
  }
}

/**
 * Notion予約データベースから特定の顧客の予約を取得
 * @param customerName 顧客名
 * @returns Notion予約データの配列
 */
export async function getNotionReservationsByCustomer(customerName: string) {
  try {
    const searchQuery = customerName;
    const command = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
      query: searchQuery,
      query_type: "internal",
      data_source_url: NOTION_RESERVATION_DATA_SOURCE_ID,
    })}'`;

    const { stdout } = await execAsync(command);
    
    // MCPツールの出力からJSONを抽出
    const lines = stdout.split('\n');
    let jsonLine = '';
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        jsonLine = line.trim();
        break;
      }
    }
    
    if (!jsonLine) {
      console.error("No JSON found in MCP output");
      return [];
    }

    const result = JSON.parse(jsonLine);
    
    if (!result.text) {
      return [];
    }

    // Markdownから予約情報を抽出
    const reservations = parseNotionReservations(result.text);
    return reservations;
  } catch (error) {
    console.error("Notion get reservations error:", error);
    return [];
  }
}

/**
 * Notion予約データベースに新しい予約を作成
 * @param reservation 予約データ
 * @returns 作成された予約のURL
 */
export async function createNotionReservation(reservation: {
  customerName: string;
  serviceType?: string;
  status: string;
  reservationDateTime: Date;
  notes?: string;
  staff?: string;
}) {
  try {
    const statusMapping: Record<string, string> = {
      pending: "予定中",
      confirmed: "来店待ち",
      completed: "完了",
      cancelled: "キャンセル",
      no_show: "キャンセル済み",
    };

    const notionStatus = statusMapping[reservation.status] || "予定中";
    const serviceType = reservation.serviceType || "整体";

    const properties = {
      Name: `${reservation.customerName} - ${serviceType}`,
      "顧客名": reservation.customerName,
      "サービス種別": serviceType,
      "ステータス": notionStatus,
      "date:予約日時:start": reservation.reservationDateTime.toISOString().split('T')[0],
      "date:予約日時:is_datetime": 1,
      "予約メモ": reservation.notes || "",
      "担当者": reservation.staff || "",
    };

    const command = `manus-mcp-cli tool call notion-create-pages --server notion --input '${JSON.stringify({
      parent: { data_source_id: NOTION_RESERVATION_DATA_SOURCE_ID.replace("collection://", "") },
      pages: [{ properties }],
    })}'`;

    const { stdout } = await execAsync(command);
    
    // MCPツールの出力からURLを抽出
    const urlMatch = stdout.match(/https:\/\/www\.notion\.so\/[a-f0-9]+/);
    return urlMatch ? urlMatch[0] : null;
  } catch (error) {
    console.error("Notion create reservation error:", error);
    return null;
  }
}

/**
 * Notion予約データベースの予約を更新
 * @param pageId ページID
 * @param updates 更新データ
 */
export async function updateNotionReservation(
  pageId: string,
  updates: {
    status?: string;
    notes?: string;
    staff?: string;
  }
) {
  try {
    const statusMapping: Record<string, string> = {
      pending: "予定中",
      confirmed: "来店待ち",
      completed: "完了",
      cancelled: "キャンセル",
      no_show: "キャンセル済み",
    };

    const properties: Record<string, string> = {};
    
    if (updates.status) {
      properties["ステータス"] = statusMapping[updates.status] || updates.status;
    }
    if (updates.notes !== undefined) {
      properties["予約メモ"] = updates.notes;
    }
    if (updates.staff !== undefined) {
      properties["担当者"] = updates.staff;
    }

    const command = `manus-mcp-cli tool call notion-update-page --server notion --input '${JSON.stringify({
      page_id: pageId,
      command: "update_properties",
      properties,
    })}'`;

    await execAsync(command);
    return true;
  } catch (error) {
    console.error("Notion update reservation error:", error);
    return false;
  }
}

/**
 * NotionのMarkdownレスポンスから予約情報を抽出
 */
function parseNotionReservations(markdown: string): Array<{
  id: string;
  title: string;
  customerName: string;
  serviceType: string;
  status: string;
  reservationDate: string;
  notes: string;
  staff: string;
  url: string;
}> {
  const reservations: Array<any> = [];
  
  // <page>タグから情報を抽出
  const pageRegex = /<page url="{{(https:\/\/www\.notion\.so\/[^}]+)}}"[^>]*>/g;
  const pages = markdown.match(pageRegex);
  
  if (!pages) {
    return reservations;
  }

  for (const pageTag of pages) {
    const urlMatch = pageTag.match(/url="{{([^}]+)}}"/);
    if (!urlMatch) continue;

    const url = urlMatch[1];
    const pageId = url.split('/').pop() || '';

    // ページのプロパティを抽出（簡易実装）
    const pageSection = markdown.substring(
      markdown.indexOf(pageTag),
      markdown.indexOf('</page>', markdown.indexOf(pageTag))
    );

    reservations.push({
      id: pageId,
      title: extractProperty(pageSection, 'Name') || '',
      customerName: extractProperty(pageSection, '顧客名') || '',
      serviceType: extractProperty(pageSection, 'サービス種別') || '',
      status: extractProperty(pageSection, 'ステータス') || '',
      reservationDate: extractProperty(pageSection, '予約日時') || '',
      notes: extractProperty(pageSection, '予約メモ') || '',
      staff: extractProperty(pageSection, '担当者') || '',
      url,
    });
  }

  return reservations;
}

/**
 * Markdownからプロパティ値を抽出
 */
function extractProperty(text: string, propertyName: string): string | null {
  const regex = new RegExp(`${propertyName}[:\\s]+([^\\n]+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}


/**
 * Notion顧客マスターに新しい顧客を作成
 * @param customer 顧客データ
 * @returns 作成された顧客ページのURL
 */
export async function createNotionCustomer(customer: {
  customerId: string;
  fullName: string;
  phone: string;
  email?: string;
  lastVisitDate?: Date;
}) {
  try {
    const properties = {
      Name: customer.fullName,
      "お客様番号": customer.customerId,
      "電話番号": parseFloat(customer.phone.replace(/[^0-9]/g, "")),
      "メールアドレス": customer.email || "",
      "来店日": customer.lastVisitDate ? customer.lastVisitDate.toISOString().split('T')[0] : "",
    };

    const command = `manus-mcp-cli tool call notion-create-pages --server notion --input '${JSON.stringify({
      parent: { data_source_id: NOTION_CUSTOMER_DATA_SOURCE_ID.replace("collection://", "") },
      pages: [{ properties }],
    })}'`;

    const { stdout } = await execAsync(command);
    
    // MCPツールの出力からURLを抽出
    const urlMatch = stdout.match(/https:\/\/www\.notion\.so\/[a-f0-9]+/);
    if (urlMatch) {
      return {
        url: urlMatch[0],
        pageId: urlMatch[0].split('/').pop() || '',
      };
    }
    return null;
  } catch (error) {
    console.error("Notion create customer error:", error);
    return null;
  }
}

/**
 * Notion顧客マスターから顧客を検索
 * @param phone 電話番号
 * @returns Notion顧客データ
 */
export async function searchNotionCustomerByPhone(phone: string) {
  try {
    const searchQuery = phone.replace(/[^0-9]/g, "");
    const command = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
      query: searchQuery,
      query_type: "internal",
      data_source_url: NOTION_CUSTOMER_DATA_SOURCE_ID,
    })}'`;

    const { stdout } = await execAsync(command);
    
    // MCPツールの出力からJSONを抽出
    const lines = stdout.split('\n');
    let jsonLine = '';
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        jsonLine = line.trim();
        break;
      }
    }
    
    if (!jsonLine) {
      return null;
    }

    const result = JSON.parse(jsonLine);
    
    if (!result.text) {
      return null;
    }

    // Markdownから顧客情報を抽出
    const pageRegex = /<page url="{{(https:\/\/www\.notion\.so\/[^}]+)}}"[^>]*>/;
    const match = result.text.match(pageRegex);
    
    if (match) {
      return {
        url: match[1],
        pageId: match[1].split('/').pop() || '',
      };
    }
    
    return null;
  } catch (error) {
    console.error("Notion search customer error:", error);
    return null;
  }
}


/**
 * Notion顧客マスターから顧客を名前で検索
 * @param name 顧客名
 * @returns Notion顧客データの配列
 */
export async function searchNotionCustomersByName(name: string) {
  try {
    const command = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
      query: name,
      query_type: "internal",
      data_source_url: NOTION_CUSTOMER_DATA_SOURCE_ID,
    })}'`;

    const { stdout } = await execAsync(command);
    
    // MCPツールの出力からJSONを抽出
    const lines = stdout.split('\n');
    let jsonLine = '';
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        jsonLine = line.trim();
        break;
      }
    }
    
    if (!jsonLine) {
      return [];
    }

    const result = JSON.parse(jsonLine);
    
    if (!result.text) {
      return [];
    }

    const customers = parseNotionCustomers(result.text);
    return customers;
  } catch (error) {
    console.error("Notion search customers error:", error);
    return [];
  }
}

/**
 * NotionのMarkdownレスポンスから顧客情報を抽出
 */
function parseNotionCustomers(markdown: string): Array<{
  id: string;
  name: string;
  phone: string;
  email: string;
  customerNumber: string;
  lastVisitDate: string;
  url: string;
}> {
  const customers: Array<any> = [];
  
  // <page>タグから情報を抽出
  const pageRegex = /<page url="{{(https:\/\/www\.notion\.so\/[^}]+)}}"[^>]*>/g;
  const pages = markdown.match(pageRegex);
  
  if (!pages) {
    return customers;
  }

  for (const pageTag of pages) {
    const urlMatch = pageTag.match(/url="{{([^}]+)}}"/);
    if (!urlMatch) continue;

    const url = urlMatch[1];
    const pageId = url.split('/').pop() || '';

    // ページのプロパティを抽出
    const pageSection = markdown.substring(
      markdown.indexOf(pageTag),
      markdown.indexOf('</page>', markdown.indexOf(pageTag))
    );

    customers.push({
      id: pageId,
      name: extractProperty(pageSection, 'Name') || '',
      phone: extractProperty(pageSection, '電話番号') || '',
      email: extractProperty(pageSection, 'メールアドレス') || '',
      customerNumber: extractProperty(pageSection, 'お客様番号') || '',
      lastVisitDate: extractProperty(pageSection, '来店日') || '',
      url,
    });
  }

  return customers;
}

/**
 * Notion顧客ページから詳細情報を取得
 * @param pageId NotionページID
 * @returns 顧客詳細情報
 */
export async function getNotionCustomerDetails(pageId: string) {
  try {
    const command = `manus-mcp-cli tool call notion-fetch --server notion --input '${JSON.stringify({
      id: pageId,
    })}'`;

    const { stdout } = await execAsync(command);
    
    // MCPツールの出力からJSONを抽出
    const lines = stdout.split('\n');
    let jsonLine = '';
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        jsonLine = line.trim();
        break;
      }
    }
    
    if (!jsonLine) {
      return null;
    }

    const result = JSON.parse(jsonLine);
    
    if (!result.text) {
      return null;
    }

    // プロパティを抽出
    const propertiesMatch = result.text.match(/<properties>\s*({[^}]+})\s*<\/properties>/);
    if (propertiesMatch) {
      const properties = JSON.parse(propertiesMatch[1]);
      return {
        name: properties.Name || '',
        phone: properties['電話番号'] ? String(properties['電話番号']) : '',
        email: properties['メールアドレス'] || '',
        customerNumber: properties['お客様番号'] ? String(properties['お客様番号']) : '',
        lastVisitDate: properties['来店日'] || '',
        url: result.url,
        pageId,
      };
    }
    
    return null;
  } catch (error) {
    console.error("Notion get customer details error:", error);
    return null;
  }
}

/**
 * Notion顧客情報を更新
 * @param pageId NotionページID
 * @param updates 更新データ
 */
export async function updateNotionCustomer(
  pageId: string,
  updates: {
    name?: string;
    phone?: string;
    email?: string;
    lastVisitDate?: string;
  }
) {
  try {
    const properties: Record<string, any> = {};
    
    if (updates.name) {
      properties["Name"] = updates.name;
    }
    if (updates.phone) {
      properties["電話番号"] = parseFloat(updates.phone.replace(/[^0-9]/g, ""));
    }
    if (updates.email !== undefined) {
      properties["メールアドレス"] = updates.email;
    }
    if (updates.lastVisitDate) {
      properties["来店日"] = updates.lastVisitDate;
    }

    const command = `manus-mcp-cli tool call notion-update-page --server notion --input '${JSON.stringify({
      page_id: pageId,
      command: "update_properties",
      properties,
    })}'`;

    await execAsync(command);
    return true;
  } catch (error) {
    console.error("Notion update customer error:", error);
    return false;
  }
}


/**
 * Notion予約履歴から全予約を取得（顧客リレーションが空のもの）
 */
export async function getAllNotionReservationsWithoutCustomer() {
  try {
    const command = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
      query: "予約",
      query_type: "internal",
      data_source_url: NOTION_RESERVATION_DATA_SOURCE_ID,
      limit: 100,
    })}'`;

    const { stdout } = await execAsync(command);
    const lines = stdout.split('\n');
    let jsonLine = '';
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        jsonLine = line.trim();
        break;
      }
    }

    if (!jsonLine) {
      return [];
    }

    const result = JSON.parse(jsonLine);
    
    if (!result.results || result.results.length === 0) {
      return [];
    }

    // 各予約の詳細を取得して、顧客リレーションが空のものをフィルタ
    const reservationsWithoutCustomer = [];
    for (const reservation of result.results) {
      const pageId = reservation.id;
      const fetchCommand = `manus-mcp-cli tool call notion-fetch --server notion --input '${JSON.stringify({ id: pageId })}'`;
      const { stdout: fetchStdout } = await execAsync(fetchCommand);
      
      const fetchLines = fetchStdout.split('\n');
      let fetchJsonLine = '';
      for (const line of fetchLines) {
        if (line.trim().startsWith('{')) {
          fetchJsonLine = line.trim();
          break;
        }
      }

      if (fetchJsonLine) {
        const fetchResult = JSON.parse(fetchJsonLine);
        // プロパティ部分を抽出
        const propertiesStartIndex = fetchResult.text?.indexOf('<properties>');
        const propertiesEndIndex = fetchResult.text?.indexOf('</properties>');
        if (propertiesStartIndex !== -1 && propertiesEndIndex !== -1) {
          const propertiesText = fetchResult.text.substring(propertiesStartIndex + '<properties>'.length, propertiesEndIndex).trim();
          const properties = JSON.parse(propertiesText);
          
          // 顧客リレーションが空または存在しない場合
          const customerRelation = properties["顧客"];
          if (!customerRelation || customerRelation === "" || customerRelation === "[]" || (Array.isArray(customerRelation) && customerRelation.length === 0)) {
            reservationsWithoutCustomer.push({
              id: pageId,
              url: reservation.url,
              title: reservation.title,
              customerName: properties["顧客名"] || "",
            });
          }
        }
      }
    }

    return reservationsWithoutCustomer;
  } catch (error) {
    console.error("Get reservations without customer error:", error);
    return [];
  }
}

/**
 * Notion予約の顧客リレーションを更新
 * @param reservationPageId 予約ページID
 * @param customerPageId 顧客ページID
 */
export async function linkReservationToCustomer(
  reservationPageId: string,
  customerPageId: string
) {
  try {
    const command = `manus-mcp-cli tool call notion-update-page --server notion --input '${JSON.stringify({
      data: {
        page_id: reservationPageId,
        command: "update_properties",
        properties: {
          "顧客": JSON.stringify([`https://www.notion.so/${customerPageId.replace(/-/g, '')}`]),
        },
      },
    })}'`;

    await execAsync(command);
    return true;
  } catch (error) {
    console.error("Link reservation to customer error:", error);
    return false;
  }
}

/**
 * 顧客名でNotion顧客マスターを検索
 * @param customerName 顧客名
 * @returns 顧客ページID
 */
export async function searchNotionCustomerByName(customerName: string) {
  try {
    const command = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
      query: customerName,
      query_type: "internal",
      data_source_url: NOTION_CUSTOMER_DATA_SOURCE_ID,
      limit: 5,
    })}'`;

    const { stdout } = await execAsync(command);
    const lines = stdout.split('\n');
    let jsonLine = '';
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        jsonLine = line.trim();
        break;
      }
    }

    if (!jsonLine) {
      return null;
    }

    const result = JSON.parse(jsonLine);
    
    if (!result.results || result.results.length === 0) {
      return null;
    }

    // 完全一致する顧客を探す
    for (const customer of result.results) {
      if (customer.title === customerName) {
        return customer.id;
      }
    }

    // 完全一致がない場合は最初の結果を返す
    return result.results[0].id;
  } catch (error) {
    console.error("Search Notion customer error:", error);
    return null;
  }
}

/**
 * Notion予約履歴から確定済み予約を取得（翌日が予約日のもの）
 * @returns 確定済み予約の配列
 */
export async function getConfirmedReservationsForTomorrow() {
  try {
    const command = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
      query: "確定済み",
      query_type: "internal",
      data_source_url: NOTION_RESERVATION_DATA_SOURCE_ID,
      limit: 100,
    })}'`;

    const { stdout } = await execAsync(command);
    const lines = stdout.split('\n');
    let jsonLine = '';
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        jsonLine = line.trim();
        break;
      }
    }

    if (!jsonLine) {
      return [];
    }

    const result = JSON.parse(jsonLine);
    
    if (!result.results || result.results.length === 0) {
      return [];
    }

    // 明日の日付を計算
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    // 各予約の詳細を取得して、明日が予約日のものをフィルタ
    const tomorrowReservations = [];
    for (const reservation of result.results) {
      const pageId = reservation.id;
      const fetchCommand = `manus-mcp-cli tool call notion-fetch --server notion --input '${JSON.stringify({ id: pageId })}'`;
      const { stdout: fetchStdout } = await execAsync(fetchCommand);
      
      const fetchLines = fetchStdout.split('\n');
      let fetchJsonLine = '';
      for (const line of fetchLines) {
        if (line.trim().startsWith('{')) {
          fetchJsonLine = line.trim();
          break;
        }
      }

      if (fetchJsonLine) {
        const fetchResult = JSON.parse(fetchJsonLine);
        // プロパティ部分を抽出
        const propertiesStartIndex = fetchResult.text?.indexOf('<properties>');
        const propertiesEndIndex = fetchResult.text?.indexOf('</properties>');
        if (propertiesStartIndex !== -1 && propertiesEndIndex !== -1) {
          const propertiesText = fetchResult.text.substring(propertiesStartIndex + '<properties>'.length, propertiesEndIndex).trim();
          const properties = JSON.parse(propertiesText);
          
          // ステータスが「確定済み」で、予約日時が明日のもの
          const status = properties["ステータス"];
          const reservationDate = properties["確定日時"] || properties["予約日時"];
          
          if (status === "確定済み" && reservationDate) {
            // 日付部分のみを比較
            const reservationDateString = reservationDate.split('T')[0];
            if (reservationDateString === tomorrowDateString) {
              // 顧客リレーションから顧客情報を取得
              const customerRelation = properties["顧客"];
              let customerPhone = "";
              let customerName = properties["顧客名"] || "";
              
              if (customerRelation && Array.isArray(customerRelation) && customerRelation.length > 0) {
                // 顧客ページIDを取得
                const customerPageUrl = customerRelation[0];
                const customerPageId = customerPageUrl.split('/').pop()?.replace(/-/g, '');
                
                if (customerPageId) {
                  // 顧客情報を取得
                  const customerDetails = await getNotionCustomerDetails(customerPageId);
                  if (customerDetails) {
                    customerPhone = customerDetails.phone;
                    customerName = customerDetails.name || customerName;
                  }
                }
              }
              
              tomorrowReservations.push({
                id: pageId,
                url: reservation.url,
                title: reservation.title,
                customerName,
                customerPhone,
                serviceType: properties["サービス種別"] || "整体",
                reservationDateTime: reservationDate,
                notes: properties["予約メモ"] || "",
              });
            }
          }
        }
      }
    }

    return tomorrowReservations;
  } catch (error) {
    console.error("Get confirmed reservations for tomorrow error:", error);
    return [];
  }
}


/**
 * UTC ISO文字列をJST時刻文字列 (HH:MM) に変換する
 */
function utcToJstTime(utcStr: string): string {
  const d = new Date(utcStr);
  // UTC+9
  const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);
  const h = String(jst.getUTCHours()).padStart(2, '0');
  const m = String(jst.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * UTC ISO文字列をJST日付文字列 (YYYY-MM-DD) に変換する
 */
function utcToJstDate(utcStr: string): string {
  const d = new Date(utcStr);
  const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);
  const y = jst.getUTCFullYear();
  const mo = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * MCPツール出力からJSONを抽出するヘルパー
 */
function extractMcpJson(stdout: string): string {
  const lines = stdout.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Tool execution result:')) {
      return lines.slice(i + 1).join('\n').trim();
    }
  }
  return '';
}

/**
 * 特定の日付の予約済み時間スロットをNotionから取得する
 * 予約フォームの満席表示に使用
 * @param date 日付文字列 (YYYY-MM-DD, JST)
 * @returns 予約済みスロットの配列 [{start: "10:00", end: "11:30", status: "予定中"}]
 */
export async function getBookedSlotsForDate(date: string): Promise<Array<{
  start: string;
  end: string;
  status: string;
  serviceType: string;
}>> {
  try {
    // 全件取得（最大25件×複数回）してサーバー側で日付フィルタリング
    // notion-searchは意味的検索のため特定日の予約を確実に取得できないため、
    // 全件取得してJST日付でフィルタリングする方式を採用
    const allPageIds: string[] = [];
    
    // 複数クエリで幅広く取得（同じDBなので重複はIDで除去）
    const queries = [' ', '予約', '整体', 'マッサージ', 'パーソナル'];
    const seenIds = new Set<string>();
    
    for (const q of queries) {
      try {
        const searchCommand = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
          query: q,
          query_type: "internal",
          data_source_url: NOTION_RESERVATION_DATA_SOURCE_ID,
          page_size: 25,
        })}'`;
        const { stdout } = await execAsync(searchCommand);
        const jsonStr = extractMcpJson(stdout);
        if (!jsonStr) continue;
        const result = JSON.parse(jsonStr);
        for (const page of (result.results || [])) {
          if (!seenIds.has(page.id)) {
            seenIds.add(page.id);
            allPageIds.push(page.id);
          }
        }
      } catch { /* 個別クエリ失敗は無視 */ }
    }

    if (allPageIds.length === 0) {
      return [];
    }

    // 各ページをfetchしてプロパティを取得し、対象日でフィルタリング
    const bookedSlots: Array<{ start: string; end: string; status: string; serviceType: string }> = [];
    
    // 並列fetch（最大10並列）
    const BATCH_SIZE = 10;
    for (let i = 0; i < allPageIds.length; i += BATCH_SIZE) {
      const batch = allPageIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (pageId) => {
          const fetchCommand = `manus-mcp-cli tool call notion-fetch --server notion --input '${JSON.stringify({ id: pageId })}'`;
          const { stdout } = await execAsync(fetchCommand);
          const jsonStr = extractMcpJson(stdout);
          if (!jsonStr) return null;
          const fetchResult = JSON.parse(jsonStr);
          const text = fetchResult.text || "";
          
          // <properties>タグからJSONを抽出
          const propsMatch = text.match(/<properties>\s*({[\s\S]*?})\s*<\/properties>/);
          if (!propsMatch) return null;
          return JSON.parse(propsMatch[1]);
        })
      );
      
      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const props = result.value;
        
        // ステータス確認（キャンセルは除外）
        const status = props["ステータス"] || "";
        if (status === "キャンセル" || status === "キャンセル済み") continue;
        
        // 予約日時を取得
        const startRaw = props["date:予約日時:start"];
        if (!startRaw) continue;
        
        const isDatetime = props["date:予約日時:is_datetime"];
        
        // 日付のみの場合（is_datetime=0）: YYYY-MM-DD形式
        // 日時の場合（is_datetime=1）: ISO8601 UTC形式
        let jstDate: string;
        let startTime: string;
        let endTime: string;
        
        if (!isDatetime || isDatetime === 0) {
          // 日付のみ → その日全体をブロック（10:00〜21:00として扱う）
          jstDate = startRaw; // YYYY-MM-DD形式のまま
          startTime = "10:00";
          endTime = "21:00";
        } else {
          // 日時あり → UTC→JSTに変換
          jstDate = utcToJstDate(startRaw);
          startTime = utcToJstTime(startRaw);
          const endRaw = props["date:予約日時:end"];
          if (endRaw) {
            endTime = utcToJstTime(endRaw);
          } else {
            // 終了時刻なし → 1時間半後
            const [h, m] = startTime.split(':').map(Number);
            const endMinutes = h * 60 + m + 90;
            const endH = Math.floor(endMinutes / 60);
            const endM = endMinutes % 60;
            endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
          }
        }
        
        // 対象日のみ追加
        if (jstDate !== date) continue;
        
        bookedSlots.push({
          start: startTime,
          end: endTime,
          status: status || "予定中",
          serviceType: props["サービス種別"] || "整体",
        });
      }
    }

    return bookedSlots;
  } catch (error) {
    console.error("getBookedSlotsForDate error:", error);
    return [];
  }
}

/**
 * 特定の月の予約データを集計して分析用データを返す
 * @param year 年
 * @param month 月 (1-12)
 */
export async function getReservationAnalytics(year: number, month: number): Promise<{
  totalReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  byHour: Record<string, number>;
  byService: Record<string, number>;
  byStatus: Record<string, number>;
}> {
  const analytics = {
    totalReservations: 0,
    completedReservations: 0,
    cancelledReservations: 0,
    byHour: {} as Record<string, number>,
    byService: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
  };

  try {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    // Step1: notion-searchで予約ページ一覧を取得
    const searchCommand = `manus-mcp-cli tool call notion-search --server notion --input '${JSON.stringify({
      query: "予約",
      query_type: "internal",
      data_source_url: NOTION_RESERVATION_DATA_SOURCE_ID,
      page_size: 25,
    })}'`;

    const { stdout: searchStdout } = await execAsync(searchCommand);
    const searchLines2 = searchStdout.split('\n');
    let searchJsonStr2 = '';
    for (let i = 0; i < searchLines2.length; i++) {
      if (searchLines2[i].includes('Tool execution result:')) {
        searchJsonStr2 = searchLines2.slice(i + 1).join('\n').trim();
        break;
      }
    }
    if (!searchJsonStr2) return analytics;
    
    const searchResult = JSON.parse(searchJsonStr2);
    const pages = searchResult.results || [];
    if (pages.length === 0) return analytics;

    // Step2: 各ページをfetchしてプロパティを取得
    for (const page of pages) {
      try {
        const fetchCommand = `manus-mcp-cli tool call notion-fetch --server notion --input '${JSON.stringify({
          id: page.id,
        })}'`;
        
        const { stdout: fetchStdout } = await execAsync(fetchCommand);
        const fetchLines2 = fetchStdout.split('\n');
        let fetchJsonStr2 = '';
        for (let i = 0; i < fetchLines2.length; i++) {
          if (fetchLines2[i].includes('Tool execution result:')) {
            fetchJsonStr2 = fetchLines2.slice(i + 1).join('\n').trim();
            break;
          }
        }
        if (!fetchJsonStr2) continue;
        
        const fetchResult = JSON.parse(fetchJsonStr2);
        const text = fetchResult.text || "";
        
        const propsMatch = text.match(/<properties>\s*({[\s\S]*?})\s*<\/properties>/);
        if (!propsMatch) continue;
        
        const props = JSON.parse(propsMatch[1]);
        
        // 予約日時を取得しJSTに変換
        const startUtc = props["date:予約日時:start"];
        if (!startUtc) continue;
        
        // 対象月か確認（JST変換後の日付で判定）
        const jstDate = utcToJstDate(startUtc);
        if (!jstDate.startsWith(monthStr)) continue;
        
        analytics.totalReservations++;
        
        const status = props["ステータス"] || "不明";
        analytics.byStatus[status] = (analytics.byStatus[status] || 0) + 1;
        if (status === "完了") analytics.completedReservations++;
        if (status === "キャンセル" || status === "キャンセル済み") analytics.cancelledReservations++;
        
        const service = props["サービス種別"] || "不明";
        analytics.byService[service] = (analytics.byService[service] || 0) + 1;
        
        // JST時間帯別集計
        const jstTime = utcToJstTime(startUtc);
        const hour = jstTime.split(':')[0] + ":00";
        analytics.byHour[hour] = (analytics.byHour[hour] || 0) + 1;
      } catch (pageError) {
        console.error(`getReservationAnalytics: error fetching page ${page.id}:`, pageError);
        continue;
      }
    }

    return analytics;
  } catch (error) {
    console.error("getReservationAnalytics error:", error);
    return analytics;
  }
}
