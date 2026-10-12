/* =====================================================================
   HF Solutions — Core Print E12 : PROPERTY SOCIETY  (coreId: 'society')
   Version: SOC-2026-10-12-a            Tayyar kiya: 12 Oct 2026
   ---------------------------------------------------------------------
   KYA BANA (haal)
   - Pehla client: ek housing society ki sub branch.
   - Kaam ka dhancha: investors, zameen ki khareed (qiston par), zameen Head
     Office ko dena ya khud bechna, agents ka commission, partners ki nikasi,
     Head Office ki advance.
   - App: society-app.html (ek file, PWA jaisi, Supabase par).
     Isi ka naqsha claude.ai par "Investor Khata" artifact mein bhi chalta hai.
   - Hisaab: double-entry journal har entry se KHUD banta hai (haath se koi
     account nahi likhta). 21 accounts (neeche `coa`). Investor ka munafa har
     qist ki tareekh par kharche mein jata hai (accrual). Zameen HO ko dene ya
     bechne par aamdani + lagat dono entries bantin hain.
   - Reports: Accounts check (Trial Balance), Profit & Loss (partners mein
     taqseem), Own & owe (Balance Sheet), Cash book, One account (ledger,
     party ke hisaab se bhi), All entries (journal), Who owes what, Partners.
     Har report CSV mein, poora data ek export mein.
   - Zaban: English (aasaan) + Urdu Nastaliq saath saath. WhatsApp raseed aur
     yaad dehani dono zabanon mein, aakhir mein society ka naam.
   - Examples mode: 9 misaalein, kuch save nahi hota (demo / training ke liye).

   DATABASE (Supabase "Hf Solutions")
   - Nayi table: public.hf_society  (owner_uid, client_id, coll, doc_id, data,
     updated_at, deleted_at). PK (owner_uid, coll, doc_id).
     coll sirf: investors | purchases | deals | receipts | outflows | settings
   - RLS: client sirf apni rows (owner_uid = auth.uid(), client_id = 'c_'+uid[0..8]);
     hf_admins sirf parh sakte hain; anon kuch nahi.
   - Delete = soft (deleted_at). Kuch mitta nahi — SQL se wapas aa sakta hai.
   - Data 1000-1000 ke hisson mein aata hai — 5,000 wali had is app par nahi.
   - Setup: society-setup.sql (table + RLS + hf_setup parcha). Dry run asal
     database par chala, 10/10 jaanch paas, rollback — abhi CHALANA BAQI hai.

   HF USOOL JO NIBHAYE
   - Apna HF_APP = 'society', apna storageKey 'hf-society-auth' (session leak nahi).
   - coreId pehra: agar login ka hf_clients row kisi aur core ka ho (restaurant,
     carRental...) to app sign-out kar deti hai, kuch nahi chhooti.
   - Parcha (hf_setup, core_id 'society') pehle login par claim; hf_clients row
     hf_write_blob se banta hai: { coreId:'society', name, coreVersion:1 }.
   - Settings (society ka naam, partners) parche se ek dafa aati hain; uske baad
     client ki apni (Principle 6). Balances kabhi import nahi.
   - APP_VER Settings aur login screen par nazar aata hai (cache pehchanne ke liye).

   JAANCH (12 Oct 2026)
   - Database dry run: 10/10 (upsert, soft delete, doosre client ka data na
     dikhe/na likhe, ghalat collection inkaar, anon inkaar, trigger).
   - App (Supabase ki naqal ke saath): 41/41 — login, Cheema ka login inkaar,
     bina parche inkaar, claim, dobara kholna, har entry save, TB/BS barabar,
     soft delete, network fail par "Not saved", 2,600 records, CSV, examples
     Supabase ko kuch nahi bhejta, sign out, phone layout.
   - Khata (sab buttons + reports): 91/91.

   BAQI (agla kaam)
   1. society-setup.sql chalana + login banana (Auth → Add user, Auto Confirm).
   2. admin.html ko 'society' Core sikhana (repo chahiye) — tab tak parcha SQL se.
   3. OUTBOX (offline entry) — abhi internet ke baghair entry save nahi hoti.
   4. index.html par "Property Society" ka button.
   5. tests.html mein society ke test.
   6. Baad mein: Main branch ke modules (plot inventory, member booking/wasooli,
      transfer, balloting, possession, maintenance) — isi Core mein, branch type
      ke mutabiq deny-by-default.
   ===================================================================== */

window.COREPRINTS = window.COREPRINTS || {};

window.COREPRINTS.society = {
  id: 'society',
  version: 1,
  app: 'society-app.html',
  storage: { table: 'hf_society', collections: ['investors','purchases','deals','receipts','outflows','settings'], softDelete: true, pageSize: 1000 },

  vocabulary: {               // keys only — text comes from LANG_SOCIETY
    customer: 'v.investor', item: 'v.land', order: 'v.deal', partner: 'v.partner', headOffice: 'v.headOffice'
  },

  entities: {
    investor: { coll: 'investors', fields: ['name','phone','ref','amount','start','pct','months','plan','cashIn','paid','note'],
                plans: ['monthly','end'], defaults: { pct: 25, months: 12, plan: 'monthly', cashIn: true } },
    land:     { coll: 'purchases', fields: ['seller','phone','ref','location','date','total','schedule','dispo','ho','sale','note'],
                dispo: ['', 'ho', 'sold'] },              // '' = still with sub-branch
    agentDeal:{ coll: 'deals',     fields: ['agent','phone','ref','date','value','pct','commission','payments','note'] },
    receipt:  { coll: 'receipts',  fields: ['date','amount','purpose','purId','ref','note'],
                purposes: ['advance','land','capA','capZ'] },
    payment:  { coll: 'outflows',  fields: ['kind','who','date','amount','ref','note'],
                kinds: ['owner','office','other'], who: ['A','Z','both'] },
    settings: { coll: 'settings', doc: 'profile',
                fields: ['soc','socUr','branch','branchUr','addr','phone','p1en','p1ur','p1','p2en','p2ur','p2'] }
  },

  tabs: ['home','inv','pur','deal','ho','rep'],              // deny-by-default: nothing else exists

  dashboard: ['cashInHand','owedToInvestors','landWeOwn','toReceive','toPay','headOfficeAdvances','netProfitYear','paymentsDue','collectionsDue'],

  quickActions: ['newInvestor','payReturn','newLandPurchase','handToHeadOffice','sellDirect','receiveFromBuyer','newAgentDeal','payCommission','receipt','payment'],

  modules: {
    default:  ['investors','land','headOfficeHandover','directSale','commission','cash','partners','reports','whatsapp','examples','csvExport'],
    optional: [],
    later:    ['plotInventory','memberBooking','memberCollections','transfer','balloting','possession','maintenance','outbox']
  },

  cogsMethod: 'specific',      // each land's own cost moves to 5100 when handed over or sold
  profitRecognition: 'accrual',// investor profit expensed on each return's due date (or earlier payment)

  coa: {                       // code: [type, key]   A=asset L=liability E=equity I=income X=expense
    '1000': ['A','coa.cash'],
    '1500': ['A','coa.land'],
    '1600': ['A','coa.hoOwes'],
    '1610': ['A','coa.buyersOwe'],
    '2100': ['L','coa.sellersOwed'],
    '2200': ['L','coa.agentsOwed'],
    '2400': ['L','coa.investorMoney'],
    '2410': ['L','coa.investorProfitDue'],
    '2500': ['L','coa.hoAdvances'],
    '3100': ['E','coa.putIn1'],
    '3110': ['E','coa.putIn2'],
    '3200': ['E','coa.takenOut1'],
    '3210': ['E','coa.takenOut2'],
    '3900': ['E','coa.oldRecords'],
    '4100': ['I','coa.landSold'],
    '4200': ['I','coa.landToHO'],
    '5100': ['X','coa.landCost'],
    '5200': ['X','coa.commission'],
    '5300': ['X','coa.investorProfit'],
    '5400': ['X','coa.office'],
    '5900': ['X','coa.other']
  },

  postingRules: {              // how each event becomes a journal entry
    investmentIn:      [['1000','dr'],['2400','cr']],          // old record: 3900 instead of 1000
    investorProfitDue: [['5300','dr'],['2410','cr']],
    investorReturnPaid:[['2410','dr'],['2400','dr'],['1000','cr']],
    landBought:        [['1500','dr'],['2100','cr']],
    landSellerPaid:    [['2100','dr'],['1000','cr']],
    landToHO:          [['1600','dr'],['4200','cr'],['5100','dr'],['1500','cr']],
    hoPaysForLand:     [['1000','dr'],['1600','cr']],
    landSoldDirect:    [['1610','dr'],['4100','cr'],['5100','dr'],['1500','cr']],
    buyerPays:         [['1000','dr'],['1610','cr']],
    hoAdvance:         [['1000','dr'],['2500','cr']],
    partnerPutsIn:     [['1000','dr'],['3100|3110','cr']],
    commissionDue:     [['5200','dr'],['2200','cr']],
    commissionPaid:    [['2200','dr'],['1000','cr']],
    partnerTakesOut:   [['3200|3210','dr'],['1000','cr']],   // 'both' split by share
    officeExpense:     [['5400','dr'],['1000','cr']],
    otherExpense:      [['5900','dr'],['1000','cr']]
  },

  reports: ['tb','pl','bs','cash','ledger','journal','parties','partners'],

  numbering: { journal: 'JV-0001', fiscalYearStart: '07-01' },

  rules: {
    partnerSharesTotal: 100,
    landPriceReceiptNeedsLand: true,     // HO "land price" must name which land
    onlyHandedLandForHOPayment: true,
    deleteNeedsConfirm: true,
    softDelete: true,
    demoNeverSaves: true,
    whatsappOffInDemo: true,
    coreGuard: true                      // other coreId on this login → sign out, touch nothing
  },

  lang: 'LANG_SOCIETY'
};

window.LANG_SOCIETY = {
  en: {
    'v.investor':'Investor','v.land':'Land','v.deal':'Deal','v.partner':'Partner','v.headOffice':'Head Office',
    'coa.cash':'Cash in Hand','coa.land':'Land We Own (at cost)','coa.hoOwes':'Head Office Owes Us','coa.buyersOwe':'Buyers Owe Us',
    'coa.sellersOwed':'We Owe Land Sellers','coa.agentsOwed':'We Owe Agents','coa.investorMoney':'Investors’ Money','coa.investorProfitDue':'Profit Owed to Investors',
    'coa.hoAdvances':'Head Office Advances','coa.putIn1':'Money Put In — Partner 1','coa.putIn2':'Money Put In — Partner 2',
    'coa.takenOut1':'Taken Out — Partner 1','coa.takenOut2':'Taken Out — Partner 2','coa.oldRecords':'Old Records (before this app)',
    'coa.landSold':'Land Sold','coa.landToHO':'Land Given to Head Office','coa.landCost':'Cost of Land Sold or Given',
    'coa.commission':'Commission Paid to Agents','coa.investorProfit':'Profit to Investors','coa.office':'Office Expenses','coa.other':'Other Expenses',
    'rep.tb':'Accounts check','rep.pl':'Profit & Loss','rep.bs':'Own & owe','rep.cash':'Cash book','rep.ledger':'One account','rep.journal':'All entries','rep.parties':'Who owes what','rep.partners':'Partners'
  },
  ur: {
    'v.investor':'سرمایہ کار','v.land':'زمین','v.deal':'سودا','v.partner':'شراکت دار','v.headOffice':'ہیڈ آفس',
    'coa.cash':'نقد رقم','coa.land':'ہماری زمین (لاگت پر)','coa.hoOwes':'ہیڈ آفس سے لینا ہے','coa.buyersOwe':'خریداروں سے لینا ہے',
    'coa.sellersOwed':'زمین فروشوں کو دینا ہے','coa.agentsOwed':'ایجنٹوں کو دینا ہے','coa.investorMoney':'سرمایہ کاروں کی رقم','coa.investorProfitDue':'سرمایہ کاروں کو منافع دینا ہے',
    'coa.hoAdvances':'ہیڈ آفس کی پیشگی رقم','coa.putIn1':'سرمایہ — شراکت دار 1','coa.putIn2':'سرمایہ — شراکت دار 2',
    'coa.takenOut1':'نکاسی — شراکت دار 1','coa.takenOut2':'نکاسی — شراکت دار 2','coa.oldRecords':'پرانا حساب (ایپ سے پہلے)',
    'coa.landSold':'زمین کی فروخت','coa.landToHO':'ہیڈ آفس کو دی گئی زمین','coa.landCost':'فروخت/حوالہ شدہ زمین کی لاگت',
    'coa.commission':'ایجنٹوں کا کمیشن','coa.investorProfit':'سرمایہ کاروں کا منافع','coa.office':'دفتری اخراجات','coa.other':'دیگر اخراجات',
    'rep.tb':'میزانِ آزمائشی','rep.pl':'نفع و نقصان','rep.bs':'میزانیہ','rep.cash':'روکڑ بہی','rep.ledger':'کھاتہ','rep.journal':'روزنامچہ','rep.parties':'کس کا کتنا','rep.partners':'شراکت دار'
  }
};
