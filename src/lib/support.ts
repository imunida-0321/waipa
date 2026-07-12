import * as Linking from 'expo-linking'
import * as StoreReview from 'expo-store-review'

export const SUPPORT_EMAIL = 'hirokazu.official@gmail.com'

// 「要望・問い合わせ」行から呼ぶ。メールアプリ未設定端末でも落とさない
export async function contactSupport(): Promise<void> {
	const subject = encodeURIComponent('【WaiPa】要望・問い合わせ')
	try {
		await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`)
	} catch {
		// メールアプリを開けない環境では何もしない
	}
}

// 「レビューを書く」行から呼ぶ。OS のアプリ内レビューが使えない環境では何もしない
// （ストア掲載URLへのフォールバックはリリース後、ストアIDが確定してから追加する）
export async function writeReview(): Promise<void> {
	if (await StoreReview.hasAction()) {
		await StoreReview.requestReview()
	}
}
