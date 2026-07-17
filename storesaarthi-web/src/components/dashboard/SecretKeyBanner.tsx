type Props = {
  secretKey: string
  onDismiss: () => void
}

export function SecretKeyBanner({ secretKey, onDismiss }: Props) {
  return (
    <div className="dash__secret" style={{ margin: '0 0 24px' }}>
      <p className="dash__secret-title">Save your secret key</p>
      <p className="dash__secret-body">
        This is shown only once. Use it to sign in on other devices.
      </p>
      <code>{secretKey}</code>
      <button type="button" className="auth-btn" onClick={onDismiss}>
        I've saved it
      </button>
    </div>
  )
}
