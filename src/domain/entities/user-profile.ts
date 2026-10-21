export class UserProfile {
  initials?: string
  pictureKey?: string

  constructor (readonly id: string) { }

  setPicture ({ pictureKey, name }: { pictureKey?: string, name?: string }): void {
    this.pictureKey = pictureKey
    if (pictureKey === undefined && name !== undefined && name !== '') {
      const firstLetters = name.match(/\b(.)/g)!
      if (firstLetters.length > 1) {
        this.initials = `${firstLetters.shift()!}${firstLetters.pop()!}`.toLocaleUpperCase()
      } else {
        this.initials = firstLetters[0].toLocaleUpperCase()
      }
    }
  }
}
