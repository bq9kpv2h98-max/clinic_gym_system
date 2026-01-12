import { SettlementData } from "../db/settlement";
import ExcelJS from "exceljs";

/**
 * PDF生成（weasyprint使用）
 */
export async function generatePDF(data: SettlementData): Promise<Buffer> {
  const html = generateReportHTML(data);
  
  // weasyprint CLIを使用してPDFを生成
  const { execSync } = require("child_process");
  const fs = require("fs");
  const path = require("path");
  const tempDir = "/tmp";
  const htmlFile = path.join(tempDir, `report_${Date.now()}.html`);
  const pdfFile = path.join(tempDir, `report_${Date.now()}.pdf`);

  try {
    fs.writeFileSync(htmlFile, html);
    execSync(`weasyprint ${htmlFile} ${pdfFile}`, { stdio: "pipe" });
    const pdfBuffer = fs.readFileSync(pdfFile);
    fs.unlinkSync(htmlFile);
    fs.unlinkSync(pdfFile);
    return pdfBuffer;
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate PDF");
  }
}

/**
 * Excel生成
 */
export async function generateExcel(data: SettlementData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("決算報告書");

  // タイトル
  worksheet.mergeCells("A1:D1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `${data.facilityName} - ${data.year}年${data.month}月次決算報告書`;
  titleCell.font = { bold: true, size: 14 };

  // 基本情報
  let row = 3;
  worksheet.getCell(row, 1).value = "施設名";
  worksheet.getCell(row, 2).value = data.facilityName;
  row++;
  worksheet.getCell(row, 1).value = "報告期間";
  worksheet.getCell(row, 2).value = `${data.year}年${data.month}月`;
  row++;

  // 売上サマリー
  row += 2;
  const summaryTitle = worksheet.getCell(row, 1);
  summaryTitle.value = "売上サマリー";
  summaryTitle.font = { bold: true, size: 12 };
  row++;

  const summaryData = [
    ["項目", "金額"],
    ["総売上", `¥${data.totalSales.toLocaleString()}`],
    ["取引件数", data.totalTransactions],
    ["顧客数", data.totalCustomers],
    ["平均取引額", `¥${data.averageTransactionAmount.toLocaleString()}`],
    ["消費税", `¥${data.totalTax.toLocaleString()}`],
    ["割引額", `¥${data.totalDiscount.toLocaleString()}`],
  ];

  summaryData.forEach((rowData) => {
    rowData.forEach((cell, col) => {
      worksheet.getCell(row, col + 1).value = cell;
    });
    row++;
  });

  // 支払い方法別
  row += 2;
  const paymentTitle = worksheet.getCell(row, 1);
  paymentTitle.value = "支払い方法別集計";
  paymentTitle.font = { bold: true, size: 12 };
  row++;

  const paymentData = [
    ["支払い方法", "金額"],
    ["現金", `¥${data.paymentMethodBreakdown.cash.toLocaleString()}`],
    ["クレジットカード", `¥${data.paymentMethodBreakdown.creditCard.toLocaleString()}`],
    ["QRコード", `¥${data.paymentMethodBreakdown.qrCode.toLocaleString()}`],
    ["その他", `¥${data.paymentMethodBreakdown.other.toLocaleString()}`],
  ];

  paymentData.forEach((rowData) => {
    rowData.forEach((cell, col) => {
      worksheet.getCell(row, col + 1).value = cell;
    });
    row++;
  });

  // 顧客分析
  row += 2;
  const customerTitle = worksheet.getCell(row, 1);
  customerTitle.value = "顧客分析";
  customerTitle.font = { bold: true, size: 12 };
  row++;

  const customerData = [
    ["指標", "数値"],
    ["新規顧客", data.newCustomers],
    ["リピーター", data.returningCustomers],
    ["CPA（顧客獲得単価）", `¥${data.cpa.toLocaleString()}`],
  ];

  customerData.forEach((rowData) => {
    rowData.forEach((cell, col) => {
      worksheet.getCell(row, col + 1).value = cell;
    });
    row++;
  });

  // 広告効果
  row += 2;
  const adTitle = worksheet.getCell(row, 1);
  adTitle.value = "広告効果分析";
  adTitle.font = { bold: true, size: 12 };
  row++;

  const adData = [
    ["指標", "数値"],
    ["総広告費", `¥${data.totalAdvertisingExpense.toLocaleString()}`],
    ["ROAS（広告費用対効果）", `${(data.roas / 100).toFixed(1)}倍`],
  ];

  adData.forEach((rowData) => {
    rowData.forEach((cell, col) => {
      worksheet.getCell(row, col + 1).value = cell;
    });
    row++;
  });

  // 顧客別売上Top10
  row += 2;
  const topTitle = worksheet.getCell(row, 1);
  topTitle.value = "顧客別売上Top10";
  topTitle.font = { bold: true, size: 12 };
  row++;

  const topCustomerHeaders = ["順位", "顧客名", "売上", "来院回数"];
  topCustomerHeaders.forEach((header, col) => {
    const cell = worksheet.getCell(row, col + 1);
    cell.value = header;
    cell.font = { bold: true };
  });
  row++;

  data.topCustomers.forEach((customer, index) => {
    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = customer.customerName;
    worksheet.getCell(row, 3).value = `¥${customer.totalSpent.toLocaleString()}`;
    worksheet.getCell(row, 4).value = customer.visitCount;
    row++;
  });

  // 列幅調整
  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 25;
  worksheet.getColumn(3).width = 20;
  worksheet.getColumn(4).width = 15;

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}

/**
 * HTML生成
 */
export async function generateHTML(data: SettlementData): Promise<string> {
  return generateReportHTML(data);
}

/**
 * HTML報告書テンプレート
 */
function generateReportHTML(data: SettlementData): string {
  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatPercent = (value: number) => `${(value / 100).toFixed(1)}%`;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.facilityName} - ${data.year}年${data.month}月次決算報告書</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 28px;
      color: #0066cc;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 14px;
      color: #666;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .info-row strong {
      color: #333;
    }
    
    section {
      margin-bottom: 40px;
    }
    
    section h2 {
      font-size: 18px;
      color: #0066cc;
      border-left: 4px solid #0066cc;
      padding-left: 10px;
      margin-bottom: 15px;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .summary-card {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #0066cc;
    }
    
    .summary-card .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .summary-card .value {
      font-size: 20px;
      font-weight: bold;
      color: #0066cc;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    table th {
      background-color: #0066cc;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    table td {
      padding: 10px 12px;
      border-bottom: 1px solid #ddd;
    }
    
    table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    table tr:hover {
      background-color: #f0f0f0;
    }
    
    .text-right {
      text-align: right;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
    
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 0;
      }
      section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.facilityName}</h1>
      <p>${data.year}年${data.month}月次決算報告書</p>
    </div>
    
    <div class="info-row">
      <div><strong>施設名:</strong> ${data.facilityName}</div>
      <div><strong>報告期間:</strong> ${data.year}年${data.month}月</div>
      <div><strong>生成日:</strong> ${new Date().toLocaleDateString("ja-JP")}</div>
    </div>
    
    <!-- 売上サマリー -->
    <section>
      <h2>売上サマリー</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">総売上</div>
          <div class="value">${formatCurrency(data.totalSales)}</div>
        </div>
        <div class="summary-card">
          <div class="label">取引件数</div>
          <div class="value">${data.totalTransactions}件</div>
        </div>
        <div class="summary-card">
          <div class="label">顧客数</div>
          <div class="value">${data.totalCustomers}人</div>
        </div>
        <div class="summary-card">
          <div class="label">平均取引額</div>
          <div class="value">${formatCurrency(data.averageTransactionAmount)}</div>
        </div>
      </div>
      
      <table>
        <tr>
          <th>項目</th>
          <th class="text-right">金額</th>
        </tr>
        <tr>
          <td>総売上</td>
          <td class="text-right">${formatCurrency(data.totalSales)}</td>
        </tr>
        <tr>
          <td>消費税</td>
          <td class="text-right">${formatCurrency(data.totalTax)}</td>
        </tr>
        <tr>
          <td>割引額</td>
          <td class="text-right">${formatCurrency(data.totalDiscount)}</td>
        </tr>
      </table>
    </section>
    
    <!-- 支払い方法別 -->
    <section>
      <h2>支払い方法別集計</h2>
      <table>
        <tr>
          <th>支払い方法</th>
          <th class="text-right">金額</th>
          <th class="text-right">割合</th>
        </tr>
        <tr>
          <td>現金</td>
          <td class="text-right">${formatCurrency(data.paymentMethodBreakdown.cash)}</td>
          <td class="text-right">${formatPercent((data.paymentMethodBreakdown.cash / data.totalSales) * 10000)}</td>
        </tr>
        <tr>
          <td>クレジットカード</td>
          <td class="text-right">${formatCurrency(data.paymentMethodBreakdown.creditCard)}</td>
          <td class="text-right">${formatPercent((data.paymentMethodBreakdown.creditCard / data.totalSales) * 10000)}</td>
        </tr>
        <tr>
          <td>QRコード</td>
          <td class="text-right">${formatCurrency(data.paymentMethodBreakdown.qrCode)}</td>
          <td class="text-right">${formatPercent((data.paymentMethodBreakdown.qrCode / data.totalSales) * 10000)}</td>
        </tr>
        <tr>
          <td>その他</td>
          <td class="text-right">${formatCurrency(data.paymentMethodBreakdown.other)}</td>
          <td class="text-right">${formatPercent((data.paymentMethodBreakdown.other / data.totalSales) * 10000)}</td>
        </tr>
      </table>
    </section>
    
    <!-- 顧客分析 -->
    <section>
      <h2>顧客分析</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">新規顧客</div>
          <div class="value">${data.newCustomers}人</div>
        </div>
        <div class="summary-card">
          <div class="label">リピーター</div>
          <div class="value">${data.returningCustomers}人</div>
        </div>
        <div class="summary-card">
          <div class="label">CPA</div>
          <div class="value">${formatCurrency(data.cpa)}</div>
        </div>
        <div class="summary-card">
          <div class="label">ポイント付与</div>
          <div class="value">${data.totalPointsEarned}pt</div>
        </div>
      </div>
    </section>
    
    <!-- 広告効果 -->
    <section>
      <h2>広告効果分析</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">総広告費</div>
          <div class="value">${formatCurrency(data.totalAdvertisingExpense)}</div>
        </div>
        <div class="summary-card">
          <div class="label">ROAS</div>
          <div class="value">${(data.roas / 100).toFixed(1)}倍</div>
        </div>
      </div>
    </section>
    
    <!-- 顧客別売上Top10 -->
    <section>
      <h2>顧客別売上Top10</h2>
      <table>
        <tr>
          <th>順位</th>
          <th>顧客名</th>
          <th class="text-right">売上</th>
          <th class="text-right">来院回数</th>
        </tr>
        ${data.topCustomers.map((customer, index) => `<tr><td>${index + 1}</td><td>${customer.customerName}</td><td class="text-right">${formatCurrency(customer.totalSpent)}</td><td class="text-right">${customer.visitCount}回</td></tr>`).join("")}
      </table>
    </section>
    
    <div class="footer">
      <p>このレポートは自動生成されました。</p>
      <p>生成日時: ${new Date().toLocaleString("ja-JP")}</p>
    </div>
  </div>
</body>
</html>
  `;
}
