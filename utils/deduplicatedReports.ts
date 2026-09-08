import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sewadar, SewadarDetails } from '../types';
import { GENTS_GROUPS, GENTS_INCHARGES } from '../constants';

export interface UniqueVolunteer {
  id: string;
  name: string;
  cleanKey: string;
  gender: 'Gents' | 'Ladies';
  groups: string[];
  primaryGroup: string;
  phone: string;
  address: string;
  dob?: string;
}

export const toProperCase = (str: string): string => {
  if (!str) return "";
  const cleaned = str.replace(/[_\-–]/g, ' ').replace(/[^a-zA-Z\s]/g, '');
  return cleaned
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const cleanNameForDeduplication = (name: string): string => {
  if (!name) return "";
  let n = name.trim().toLowerCase();
  // Strip common honorifics/prefixes like mr., mrs., ms., sh., smt., dr.
  n = n.replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|smt\.?|sh\.?)\s+/i, '');
  // Remove symbols and punctuation
  n = n.replace(/[_\-–`'".,]/g, ' ');
  // Collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();
  return n;
};

export const normalizeGroup = (rawGroup: string): string => {
  if (!rawGroup) return 'Other';
  const clean = rawGroup.replace(/^ladies-/i, '').replace(/^gents-/i, '').trim();
  const matched = GENTS_GROUPS.find(g => g.toLowerCase() === clean.toLowerCase());
  return matched || clean;
};

export const isSewadarInGroup = (s: Sewadar, groupName: string): boolean => {
  const sGroupLower = (s.group || '').toLowerCase().trim();
  const targetLower = groupName.toLowerCase().trim();
  return (
    sGroupLower === targetLower ||
    sGroupLower === `ladies-${targetLower}` ||
    sGroupLower === `gents-${targetLower}`
  );
};

/**
 * Deduplicated list of all Ladies across all groups.
 * Every lady appears exactly once.
 */
export const getUniqueLadiesList = (
  sewadars: Sewadar[],
  details: Record<string, SewadarDetails> = {}
): UniqueVolunteer[] => {
  const map = new Map<string, UniqueVolunteer>();

  sewadars
    .filter(s => s.gender === 'Ladies')
    .forEach(s => {
      const cleanKey = cleanNameForDeduplication(s.name);
      if (!cleanKey) return;

      const groupName = normalizeGroup(s.group);
      const sDetail = details[s.id];
      const phone = sDetail?.phone || s.hrTableData?.phoneNumber || '';
      const address = sDetail?.address || s.hrTableData?.address || '';
      const dob = sDetail?.dob || '';

      if (map.has(cleanKey)) {
        const existing = map.get(cleanKey)!;
        if (!existing.groups.includes(groupName)) {
          existing.groups.push(groupName);
        }
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.address && address) existing.address = address;
        if (!existing.dob && dob) existing.dob = dob;
      } else {
        map.set(cleanKey, {
          id: s.id,
          name: toProperCase(s.name),
          cleanKey,
          gender: 'Ladies',
          groups: [groupName],
          primaryGroup: groupName,
          phone,
          address,
          dob
        });
      }
    });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Deduplicated list of all Gents across all groups.
 * Every gent appears exactly once.
 */
export const getUniqueGentsList = (
  sewadars: Sewadar[],
  details: Record<string, SewadarDetails> = {}
): UniqueVolunteer[] => {
  const map = new Map<string, UniqueVolunteer>();

  sewadars
    .filter(s => s.gender === 'Gents')
    .forEach(s => {
      const cleanKey = cleanNameForDeduplication(s.name);
      if (!cleanKey) return;

      const groupName = normalizeGroup(s.group);
      const sDetail = details[s.id];
      const phone = sDetail?.phone || s.hrTableData?.phoneNumber || '';
      const address = sDetail?.address || s.hrTableData?.address || '';
      const dob = sDetail?.dob || '';

      if (map.has(cleanKey)) {
        const existing = map.get(cleanKey)!;
        if (!existing.groups.includes(groupName)) {
          existing.groups.push(groupName);
        }
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.address && address) existing.address = address;
        if (!existing.dob && dob) existing.dob = dob;
      } else {
        map.set(cleanKey, {
          id: s.id,
          name: toProperCase(s.name),
          cleanKey,
          gender: 'Gents',
          groups: [groupName],
          primaryGroup: groupName,
          phone,
          address,
          dob
        });
      }
    });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Group-wise unique lists for Gents across all 15 groups.
 */
export const getGroupWiseGents = (
  sewadars: Sewadar[],
  details: Record<string, SewadarDetails> = {}
): Record<string, UniqueVolunteer[]> => {
  const result: Record<string, UniqueVolunteer[]> = {};

  GENTS_GROUPS.forEach(grp => {
    const map = new Map<string, UniqueVolunteer>();
    sewadars
      .filter(s => s.gender === 'Gents' && isSewadarInGroup(s, grp))
      .forEach(s => {
        const cleanKey = cleanNameForDeduplication(s.name);
        if (!cleanKey) return;

        const sDetail = details[s.id];
        const phone = sDetail?.phone || s.hrTableData?.phoneNumber || '';
        const address = sDetail?.address || s.hrTableData?.address || '';

        if (!map.has(cleanKey)) {
          map.set(cleanKey, {
            id: s.id,
            name: toProperCase(s.name),
            cleanKey,
            gender: 'Gents',
            groups: [grp],
            primaryGroup: grp,
            phone,
            address
          });
        }
      });
    result[grp] = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  return result;
};

/**
 * Group-wise unique lists for Ladies across all 15 groups.
 */
export const getGroupWiseLadies = (
  sewadars: Sewadar[],
  details: Record<string, SewadarDetails> = {}
): Record<string, UniqueVolunteer[]> => {
  const result: Record<string, UniqueVolunteer[]> = {};

  GENTS_GROUPS.forEach(grp => {
    const map = new Map<string, UniqueVolunteer>();
    sewadars
      .filter(s => s.gender === 'Ladies' && isSewadarInGroup(s, grp))
      .forEach(s => {
        const cleanKey = cleanNameForDeduplication(s.name);
        if (!cleanKey) return;

        const sDetail = details[s.id];
        const phone = sDetail?.phone || s.hrTableData?.phoneNumber || '';
        const address = sDetail?.address || s.hrTableData?.address || '';

        if (!map.has(cleanKey)) {
          map.set(cleanKey, {
            id: s.id,
            name: toProperCase(s.name),
            cleanKey,
            gender: 'Ladies',
            groups: [grp],
            primaryGroup: grp,
            phone,
            address
          });
        }
      });
    result[grp] = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  return result;
};

/* =========================================================================
   PDF GENERATORS
   ========================================================================= */

const getFormattedDate = (): string => {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * 1. LADIES MASTER REPORT (1 Single Report)
 * Total count and names of all ladies with serial number.
 * Duplicates removed, each name appears only once.
 */
export const generateLadiesMasterPDF = (ladies: UniqueVolunteer[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const dateStr = getFormattedDate();
  const totalCount = ladies.length;

  const tableBody = ladies.map((item, index) => [
    index + 1,
    item.name,
    item.groups.join(', ') || item.primaryGroup || 'Ladies',
    item.phone || '—',
    item.address || '—'
  ]);

  autoTable(doc, {
    startY: 38,
    margin: { top: 35, bottom: 15, left: 10, right: 10 },
    theme: 'grid',
    head: [['S.No', 'Volunteer Name', 'Group(s)', 'Mobile / Phone', 'Address']],
    body: tableBody,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [190, 24, 93], // Rose / Pink 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 52, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 44 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'left', cellWidth: 48 }
    },
    didDrawPage: (data) => {
      // Top Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(157, 23, 77);
      doc.text('SKRM SECURITY SEWA • LADIES MASTER DIRECTORY', 10, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(
        'Consolidated Roster of All Ladies Volunteers across All Groups (Deduplicated)',
        10,
        20
      );

      // Stat Badges
      doc.setFillColor(253, 242, 248);
      doc.setDrawColor(244, 114, 182);
      doc.setLineWidth(0.3);
      doc.roundedRect(10, 23, 85, 10, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(157, 23, 77);
      doc.text(`TOTAL UNIQUE LADIES: ${totalCount}`, 14, 29.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(`Date: ${dateStr} • Status: Active`, 140, 29.5);
    }
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Printed for SKRM Security Sewa • All Ladies Master Report • Page ${i} of ${totalPages}`,
      10,
      289
    );
  }

  doc.save(`Ladies_Master_Unique_Report_${totalCount}_Volunteers.pdf`);
};

/**
 * 2. GENTS OPTION 1: TOTAL MASTER REPORT
 * Total count of unique gents across all groups and their names.
 * Duplicates removed, each name appears only once.
 */
export const generateGentsTotalMasterPDF = (gents: UniqueVolunteer[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const dateStr = getFormattedDate();
  const totalCount = gents.length;

  const tableBody = gents.map((item, index) => [
    index + 1,
    item.name,
    item.groups.join(', ') || item.primaryGroup || 'Gents',
    item.phone || '—',
    item.address || '—'
  ]);

  autoTable(doc, {
    startY: 38,
    margin: { top: 35, bottom: 15, left: 10, right: 10 },
    theme: 'grid',
    head: [['S.No', 'Volunteer Name', 'Group(s)', 'Mobile / Phone', 'Address']],
    body: tableBody,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [30, 58, 138], // Indigo / Blue 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 52, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 44 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'left', cellWidth: 48 }
    },
    didDrawPage: (data) => {
      // Top Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text('SKRM SECURITY SEWA • GENTS MASTER DIRECTORY', 10, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(
        'Total Master Roster of All Unique Gents Volunteers across All Groups (Deduplicated)',
        10,
        20
      );

      // Stat Badges
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(147, 197, 253);
      doc.setLineWidth(0.3);
      doc.roundedRect(10, 23, 85, 10, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text(`TOTAL UNIQUE GENTS: ${totalCount}`, 14, 29.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(`Date: ${dateStr} • Status: Active`, 140, 29.5);
    }
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Printed for SKRM Security Sewa • All Gents Total Master Report • Page ${i} of ${totalPages}`,
      10,
      289
    );
  }

  doc.save(`Gents_Total_Master_Report_${totalCount}_Volunteers.pdf`);
};

/**
 * 3. GENTS OPTION 2: GROUP-WISE COUNT AND NAMES REPORT
 * Consolidated report:
 * 1) Executive Summary Table with count for every group
 * 2) Group-by-group detailed roster with unique names in each group
 */
export const generateGentsGroupWiseMasterPDF = (
  groupWiseGents: Record<string, UniqueVolunteer[]>,
  totalUniqueGentsCount: number
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const dateStr = getFormattedDate();

  // Draw First Page Title & Overview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(30, 58, 138);
  doc.text('SKRM SECURITY SEWA • GENTS GROUP-WISE REPORT', 10, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'Executive Group Breakdown & Detailed Rosters for All 15 Duty Groups (Deduplicated)',
    10,
    22
  );

  // Executive Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(10, 26, 190, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text(`GRAND TOTAL UNIQUE GENTS: ${totalUniqueGentsCount}`, 14, 33.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Groups: ${GENTS_GROUPS.length} | Date: ${dateStr}`, 130, 33.5);

  // Summary Table of Counts per Group
  const summaryRows = GENTS_GROUPS.map((grp, idx) => {
    const count = (groupWiseGents[grp] || []).length;
    const incharge = GENTS_INCHARGES[grp] || '—';
    return [idx + 1, grp, incharge, `${count} Gents`];
  });

  const sumOfGroupCounts = GENTS_GROUPS.reduce(
    (acc, grp) => acc + (groupWiseGents[grp] || []).length,
    0
  );
  summaryRows.push([
    '',
    'SUM OF GROUP ROSTERS',
    '—',
    `${sumOfGroupCounts} Total Assigned`
  ]);

  autoTable(doc, {
    startY: 42,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    head: [['S.No', 'Group Name', 'Group Incharge', 'Unique Gents Count']],
    body: summaryRows,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [30, 30, 30],
      cellPadding: 2
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 65, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 65 },
      3: { halign: 'center', cellWidth: 45, fontStyle: 'bold' }
    }
  });

  // Now Group by Group Detailed Tables
  GENTS_GROUPS.forEach(grp => {
    const list = groupWiseGents[grp] || [];
    doc.addPage();

    // Group Header Banner
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(10, 12, 190, 16, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`GROUP: ${grp.toUpperCase()} (GENTS)`, 15, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(224, 231, 255);
    const incharge = GENTS_INCHARGES[grp] ? `Incharge: ${GENTS_INCHARGES[grp]} | ` : '';
    doc.text(
      `${incharge}Total Unique Gents: ${list.length} | Date: ${dateStr}`,
      15,
      25
    );

    if (list.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('No gents registered in this group.', 15, 40);
    } else {
      const groupRows = list.map((item, idx) => [
        idx + 1,
        item.name,
        item.phone || '—',
        item.address || '—'
      ]);

      autoTable(doc, {
        startY: 33,
        margin: { top: 20, bottom: 15, left: 10, right: 10 },
        theme: 'grid',
        head: [['S.No', 'Volunteer Name', 'Mobile / Contact', 'Address']],
        body: groupRows,
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          textColor: [30, 30, 30],
          cellPadding: 2
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue 500
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
          1: { halign: 'left', cellWidth: 66, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 45 },
          3: { halign: 'left', cellWidth: 65 }
        }
      });
    }
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Printed for SKRM Security Sewa • Gents Group-Wise Master Report • Page ${i} of ${totalPages}`,
      10,
      289
    );
  }

  doc.save(`Gents_Group_Wise_Report_${GENTS_GROUPS.length}_Groups.pdf`);
};

/**
 * 4. SINGLE GROUP REPORT (For individual group card downloads)
 */
export const generateSingleGroupPDF = (
  groupName: string,
  gender: 'Gents' | 'Ladies',
  list: UniqueVolunteer[]
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const dateStr = getFormattedDate();
  const isGents = gender === 'Gents';
  const headerColor: [number, number, number] = isGents
    ? [30, 58, 138]
    : [190, 24, 93];

  const tableBody = list.map((item, index) => [
    index + 1,
    item.name,
    item.phone || '—',
    item.address || '—'
  ]);

  autoTable(doc, {
    startY: 38,
    margin: { top: 35, bottom: 15, left: 10, right: 10 },
    theme: 'grid',
    head: [['S.No', 'Volunteer Name', 'Mobile / Contact', 'Address']],
    body: tableBody,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [30, 30, 30],
      cellPadding: 2
    },
    headStyles: {
      fillColor: headerColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 66, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 45 },
      3: { halign: 'left', cellWidth: 65 }
    },
    didDrawPage: () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...headerColor);
      doc.text(`SKRM SECURITY SEWA • ${groupName.toUpperCase()}`, 10, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);
      doc.text(
        `${gender} Volunteer Directory • Deduplicated Names (Only Added Once)`,
        10,
        20
      );

      // Stat Badge
      doc.setFillColor(isGents ? 239 : 253, isGents ? 246 : 242, isGents ? 255 : 248);
      doc.setDrawColor(...headerColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(10, 23, 90, 10, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...headerColor);
      doc.text(`TOTAL UNIQUE ${gender.toUpperCase()}: ${list.length}`, 14, 29.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(`Date: ${dateStr} • Status: Active`, 140, 29.5);
    }
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Printed for SKRM Security Sewa • ${groupName} ${gender} • Page ${i} of ${totalPages}`,
      10,
      289
    );
  }

  doc.save(`${groupName}_${gender}_Unique_Report_${list.length}_Volunteers.pdf`);
};

/* =========================================================================
   CSV EXPORTS
   ========================================================================= */

const triggerCSVDownload = (filename: string, rows: string[][]) => {
  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    rows
      .map(row =>
        row
          .map(cell => `"${(cell || '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportLadiesMasterCSV = (ladies: UniqueVolunteer[]) => {
  const rows = [
    ['SKRM Security Sewa - All Ladies Master Directory (Deduplicated)'],
    [`Total Unique Ladies: ${ladies.length}`, `Date: ${getFormattedDate()}`],
    [],
    ['S.No', 'Volunteer Name', 'Group(s)', 'Mobile / Phone', 'Address']
  ];
  ladies.forEach((item, idx) => {
    rows.push([
      (idx + 1).toString(),
      item.name,
      item.groups.join(', ') || item.primaryGroup,
      item.phone || '',
      item.address || ''
    ]);
  });
  triggerCSVDownload(`Ladies_Master_Unique_Report_${ladies.length}.csv`, rows);
};

export const exportGentsTotalMasterCSV = (gents: UniqueVolunteer[]) => {
  const rows = [
    ['SKRM Security Sewa - All Gents Master Directory (Deduplicated)'],
    [`Total Unique Gents: ${gents.length}`, `Date: ${getFormattedDate()}`],
    [],
    ['S.No', 'Volunteer Name', 'Group(s)', 'Mobile / Phone', 'Address']
  ];
  gents.forEach((item, idx) => {
    rows.push([
      (idx + 1).toString(),
      item.name,
      item.groups.join(', ') || item.primaryGroup,
      item.phone || '',
      item.address || ''
    ]);
  });
  triggerCSVDownload(`Gents_Total_Master_Report_${gents.length}.csv`, rows);
};

export const exportGentsGroupWiseCSV = (
  groupWiseGents: Record<string, UniqueVolunteer[]>
) => {
  const rows = [
    ['SKRM Security Sewa - Gents Group-Wise Roster (Deduplicated)'],
    [`Generated On: ${getFormattedDate()}`],
    [],
    ['Group', 'S.No', 'Volunteer Name', 'Mobile / Phone', 'Address']
  ];

  GENTS_GROUPS.forEach(grp => {
    const list = groupWiseGents[grp] || [];
    rows.push([]);
    rows.push([`GROUP: ${grp} (Total: ${list.length} Gents)`]);
    list.forEach((item, idx) => {
      rows.push([
        grp,
        (idx + 1).toString(),
        item.name,
        item.phone || '',
        item.address || ''
      ]);
    });
  });

  triggerCSVDownload(`Gents_Group_Wise_Rosters.csv`, rows);
};
