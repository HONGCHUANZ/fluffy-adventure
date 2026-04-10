// lib/xiaohongshu.ts

const XHS_API_URL = 'https://cn8n.com/p2/xhs/search_note_web';
const API_KEY = 'IcZKwBuVQ15Oe1SXztTgo6Pap4RzZj9c';

export interface XhsNote {
  id: string;
  title: string;
  desc: string;
  liked_count: number;
  comments_count: number;
  collected_count: number;
  shared_count: number;
  timestamp: number;
  cover_url: string;
  note_url: string;
  user_id: string;
  user_nickname: string;
  user_avatar: string;
  heat: number;
}

/**
 * Fetch notes from Xiaohongshu search API.
 * Response format: { code, data: { data: [{ noteInfo, userInfo }] } }
 */
export async function searchNotes(keyword: string, page = 1): Promise<XhsNote[]> {
  const response = await fetch(XHS_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 9,
      keyword,
      page: String(page),
      sort: 'comment_descending',
      note_type: 'note',
      note_time: 'week',
      searchId: '',
      sessionId: '',
    }),
  });

  if (!response.ok) {
    throw new Error(`XHS API HTTP error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.code !== 0) {
    throw new Error(`XHS API error: ${json.msg || 'unknown'} (code: ${json.code})`);
  }

  // Response format: json.data.data[] = [{ noteInfo, userInfo }]
  const rawItems = json.data?.data || [];

  return rawItems
    .map((item: any) => {
      const ni = item.noteInfo || {};
      const ui = item.userInfo || {};

      if (!ni.noteId) return null;

      // Parse timestamp from "2026-04-05 12:47:27" format (Beijing time)
      let timestamp = 0;
      if (ni.notePublishTime) {
        const d = new Date(ni.notePublishTime.replace(' ', 'T') + '+08:00');
        timestamp = Math.floor(d.getTime() / 1000);
      }

      return {
        id: ni.noteId,
        title: ni.title || '',
        desc: '',
        liked_count: ni.likeNum || 0,
        comments_count: ni.cmtNum || 0,
        collected_count: ni.favNum || 0,
        shared_count: 0,
        timestamp,
        cover_url: ni.noteImages?.[0]?.imageUrl || '',
        note_url: ni.noteLink || `https://www.xiaohongshu.com/explore/${ni.noteId}`,
        user_id: ui.userId || '',
        user_nickname: ui.nickName || '',
        user_avatar: ui.avatar || '',
      };
    })
    .filter(Boolean)
    .map((n: any) => ({
      ...n,
      heat: (n.liked_count || 0) + (n.comments_count || 0) + (n.collected_count || 0),
    }));
}
