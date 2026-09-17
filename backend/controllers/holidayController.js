const Holiday = require('../models/Holiday');

exports.getHolidays = async (req, res) => {
  try {
    const count = await Holiday.countDocuments({});
    if (count === 0) {
      await performBulkImport();
    }
    const query = {};
    const isHrOrAdmin = req.user && (req.user.role === 'hr' || req.user.role === 'admin');
    if (req.query.all !== 'true' && !isHrOrAdmin) {
      query.isActive = { $ne: false };
    }
    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const holiday = new Holiday(req.body);
    await holiday.save();
    res.status(201).json({ message: 'Holiday created', data: holiday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndUpdate(id, req.body, { new: true });
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.status(200).json({ message: 'Holiday updated', data: holiday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.status(200).json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const safeFetchJson = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err);
    return [];
  }
};

const FALLBACK_HOLIDAYS = [
  // 2025
  { localName: "Republic Day", date: "2025-01-26", type: "public" },
  { localName: "Maha Shivratri", date: "2025-02-26", type: "public" },
  { localName: "Holi", date: "2025-03-14", type: "public" },
  { localName: "Good Friday", date: "2025-04-18", type: "public" },
  { localName: "Ambedkar Jayanti", date: "2025-04-14", type: "public" },
  { localName: "Bakrid / Eid al-Adha", date: "2025-06-07", type: "public" },
  { localName: "Muharram", date: "2025-07-06", type: "public" },
  { localName: "Independence Day", date: "2025-08-15", type: "public" },
  { localName: "Raksha Bandhan", date: "2025-08-09", type: "public" },
  { localName: "Janmashtami", date: "2025-08-16", type: "public" },
  { localName: "Ganesh Chaturthi", date: "2025-08-27", type: "public" },
  { localName: "Gandhi Jayanti", date: "2025-10-02", type: "public" },
  { localName: "Dussehra", date: "2025-10-02", type: "public" },
  { localName: "Diwali", date: "2025-10-20", type: "public" },
  { localName: "Guru Nanak Jayanti", date: "2025-11-05", type: "public" },
  { localName: "Christmas Day", date: "2025-12-25", type: "public" },

  // 2026
  { localName: "Republic Day", date: "2026-01-26", type: "public" },
  { localName: "Maha Shivratri", date: "2026-02-15", type: "public" },
  { localName: "Holi", date: "2026-03-04", type: "public" },
  { localName: "Good Friday", date: "2026-04-03", type: "public" },
  { localName: "Ambedkar Jayanti", date: "2026-04-14", type: "public" },
  { localName: "Ram Navami", date: "2026-04-16", type: "public" },
  { localName: "Mahavir Jayanti", date: "2026-04-30", type: "public" },
  { localName: "Bakrid / Eid al-Adha", date: "2026-05-27", type: "public" },
  { localName: "Muharram", date: "2026-06-26", type: "public" },
  { localName: "Independence Day", date: "2026-08-15", type: "public" },
  { localName: "Raksha Bandhan", date: "2026-08-28", type: "public" },
  { localName: "Janmashtami", date: "2026-09-04", type: "public" },
  { localName: "Ganesh Chaturthi", date: "2026-09-14", type: "public" },
  { localName: "Milad-un-Nabi", date: "2026-09-15", type: "public" },
  { localName: "Gandhi Jayanti", date: "2026-10-02", type: "public" },
  { localName: "Dussehra", date: "2026-10-20", type: "public" },
  { localName: "Diwali", date: "2026-11-08", type: "public" },
  { localName: "Guru Nanak Jayanti", date: "2026-11-24", type: "public" },
  { localName: "Christmas Day", date: "2026-12-25", type: "public" },

  // 2027
  { localName: "Republic Day", date: "2027-01-26", type: "public" },
  { localName: "Maha Shivratri", date: "2027-03-06", type: "public" },
  { localName: "Holi", date: "2027-03-22", type: "public" },
  { localName: "Good Friday", date: "2027-03-26", type: "public" },
  { localName: "Ambedkar Jayanti", date: "2027-04-14", type: "public" },
  { localName: "Ram Navami", date: "2027-04-15", type: "public" },
  { localName: "Bakrid / Eid al-Adha", date: "2027-05-17", type: "public" },
  { localName: "Independence Day", date: "2027-08-15", type: "public" },
  { localName: "Raksha Bandhan", date: "2027-08-17", type: "public" },
  { localName: "Janmashtami", date: "2027-08-25", type: "public" },
  { localName: "Ganesh Chaturthi", date: "2027-09-04", type: "public" },
  { localName: "Gandhi Jayanti", date: "2027-10-02", type: "public" },
  { localName: "Dussehra", date: "2027-10-09", type: "public" },
  { localName: "Diwali", date: "2027-10-29", type: "public" },
  { localName: "Christmas Day", date: "2027-12-25", type: "public" },

  // 2028
  { localName: "Republic Day", date: "2028-01-26", type: "public" },
  { localName: "Maha Shivratri", date: "2028-02-24", type: "public" },
  { localName: "Holi", date: "2028-03-11", type: "public" },
  { localName: "Good Friday", date: "2028-04-14", type: "public" },
  { localName: "Ambedkar Jayanti", date: "2028-04-14", type: "public" },
  { localName: "Bakrid / Eid al-Adha", date: "2028-05-05", type: "public" },
  { localName: "Independence Day", date: "2028-08-15", type: "public" },
  { localName: "Raksha Bandhan", date: "2028-08-05", type: "public" },
  { localName: "Janmashtami", date: "2028-08-13", type: "public" },
  { localName: "Ganesh Chaturthi", date: "2028-08-24", type: "public" },
  { localName: "Dussehra", date: "2028-09-28", type: "public" },
  { localName: "Gandhi Jayanti", date: "2028-10-02", type: "public" },
  { localName: "Diwali", date: "2028-10-17", type: "public" },
  { localName: "Guru Nanak Jayanti", date: "2028-11-01", type: "public" },
  { localName: "Christmas Day", date: "2028-12-25", type: "public" }
];

const performBulkImport = async () => {
  try {
    const yearsToImport = [2025, 2026, 2027, 2028];
    let rawHolidays = [];

    for (const yr of yearsToImport) {
      const yearData = await safeFetchJson(`https://date.nager.at/api/v3/PublicHolidays/${yr}/IN`);
      if (Array.isArray(yearData) && yearData.length > 0) {
        rawHolidays.push(...yearData);
      }
    }

    const combined = [...rawHolidays];
    for (const fb of FALLBACK_HOLIDAYS) {
      const fbDateStr = fb.date;
      const existsInRaw = combined.some(r => r.date === fbDateStr || (r.date && r.date.startsWith(fbDateStr)));
      if (!existsInRaw) {
        combined.push(fb);
      }
    }

    let importedCount = 0;
    for (const h of combined) {
      const searchDate = new Date(h.date);
      if (isNaN(searchDate.getTime())) continue;
      searchDate.setHours(0,0,0,0);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const holidayName = h.localName || h.name;
      const existing = await Holiday.findOne({
        date: { $gte: searchDate, $lt: nextDay }
      });

      if (!existing) {
        const holiday = new Holiday({
          name: holidayName,
          date: new Date(h.date),
          type: 'public',
          description: 'Public Holiday'
        });
        await holiday.save();
        importedCount++;
      }
    }
    console.log(`[CRON] Successfully imported/updated ${importedCount} holidays!`);
    return importedCount;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};

exports.performBulkImport = performBulkImport;

exports.bulkImportHolidays = async (req, res) => {
  try {
    const importedCount = await performBulkImport();
    res.status(200).json({ message: `Successfully imported ${importedCount} holidays!` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

