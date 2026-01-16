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

    // Markdownから顧客情報を抽出
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
