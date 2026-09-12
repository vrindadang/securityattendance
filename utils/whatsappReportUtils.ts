import { AttendanceRecord } from '../types';

export interface WhatsAppDutySummaryParams {
  dateDisplay: string;
  reportingGroupName: string;
  location: string;
  inchargeName: string;
  attendance: AttendanceRecord[];
  incidentCount: number;
}

export function formatWhatsAppDutySummary({
  dateDisplay,
  reportingGroupName,
  location,
  inchargeName,
  attendance,
  incidentCount
}: WhatsAppDutySummaryParams): string {
  const totalSewadarsOnDuty = new Set(attendance.map(a => a.sewadarId)).size;

  // Shift Logic in minutes (exact same as PDF report)
  const MOR_S = 7 * 60;
  const MOR_E = 13 * 60;
  const DAY_S = 13 * 60;
  const DAY_E = 19 * 60;
  const EVE_S = 19 * 60;
  const EVE_E = 2 * 60;
  const NIT_S = 2 * 60;
  const NIT_E = 7 * 60;

  const timeToMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const shiftCounts = {
    Morning: { total: new Set<string>() },
    Day: { total: new Set<string>() },
    Evening: { total: new Set<string>() },
    Night: { total: new Set<string>() }
  };

  attendance.forEach(a => {
    if (a.inTime) {
      const start = timeToMins(a.inTime);
      const end = a.outTime ? timeToMins(a.outTime) : (start + 1);
      const intervals: [number, number][] = [];
      if (end < start) {
        intervals.push([start, 1440]);
        intervals.push([0, end]);
      } else {
        intervals.push([start, end]);
      }

      const shifts = [
        { name: 'Morning' as const, s: MOR_S, e: MOR_E },
        { name: 'Day' as const, s: DAY_S, e: DAY_E },
        { name: 'Evening' as const, s: EVE_S, e: 1440, wrap: EVE_E },
        { name: 'Night' as const, s: NIT_S, e: NIT_E }
      ];

      shifts.forEach(shift => {
        let overlap = 0;
        intervals.forEach(([is, ie]) => {
          if (shift.wrap !== undefined) {
            overlap += Math.max(0, Math.min(ie, 1440) - Math.max(is, shift.s));
            overlap += Math.max(0, Math.min(ie, shift.wrap) - Math.max(is, 0));
          } else {
            overlap += Math.max(0, Math.min(ie, shift.e) - Math.max(is, shift.s));
          }
        });

        if (overlap > 0) {
          shiftCounts[shift.name].total.add(a.sewadarId);
        }
      });
    }
  });

  const sewadarShiftAppearance: Record<string, number> = {};
  (['Morning', 'Day', 'Evening', 'Night'] as const).forEach(shiftName => {
    shiftCounts[shiftName].total.forEach(sewadarId => {
      sewadarShiftAppearance[sewadarId] = (sewadarShiftAppearance[sewadarId] || 0) + 1;
    });
  });
  const doubleShiftSewadarsCount = Object.values(sewadarShiftAppearance).filter(c => c > 1).length;

  const incidentsText = incidentCount === 0
    ? 'No incident to be reported'
    : `${incidentCount} incident(s) reported`;

  const cleanLocation = location ? location.replace(/^\[|\]$/g, '').trim() : 'Kirpal Ashram, Kirpal Bagh';

  return `With the blessings of H.H. Sant Rajinder Singh Ji Maharaj

*SKRM Security Sewa – Daily Duty Summary*
${dateDisplay} - ${reportingGroupName}
[${cleanLocation}]

*Total Sewadars on Duty:* ${totalSewadarsOnDuty}

*Shift-wise Count:*
Morning (7 AM–1 PM): ${shiftCounts.Morning.total.size}
Day (1 PM–7 PM): ${shiftCounts.Day.total.size}
Evening (7 PM–2 AM): ${shiftCounts.Evening.total.size}
Night (2 AM–7 AM): ${shiftCounts.Night.total.size}

*Double Shift Sewadars:* ${doubleShiftSewadarsCount} sewadars covered more than one shift today

*Incidents Reported:* ${incidentsText}

Regards,
${inchargeName}`;
}
