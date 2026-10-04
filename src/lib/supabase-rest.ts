export async function fetchRows<T>(
	table: string,
	query: Record<string, string>,
	isRow: (value: unknown) => value is T,
): Promise<T[] | null> {
	try {
		const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
		const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
		const params = new URLSearchParams(query)
		const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${params}`, {
			headers: {
				apikey: anonKey,
				Authorization: `Bearer ${anonKey}`,
			},
		})
		if (!response.ok) return null
		const rows: unknown = await response.json()
		return Array.isArray(rows) ? rows.filter(isRow) : null
	} catch {
		return null
	}
}
