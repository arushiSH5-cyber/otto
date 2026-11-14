"""Make fake demo letters for Scam Check (clearly fake: 555 numbers)."""
from PIL import Image, ImageDraw, ImageFont
import sys
F = "/System/Library/Fonts/Supplemental/Times New Roman.ttf"
def letter(path, lines, head):
    im = Image.new("RGB", (900, 1100), "#fdfcf7"); d = ImageDraw.Draw(im)
    d.text((60, 50), head, fill="#111", font=ImageFont.truetype(F, 46))
    d.line((60, 120, 840, 120), fill="#333", width=3)
    y = 160; f = ImageFont.truetype(F, 32)
    for ln in lines:
        d.text((60, y), ln, fill="#111", font=f); y += 48
    im.save(path)
letter("demo/irs_scam.png", ["FINAL NOTICE - Case #IRS-88412", "", "Dear Taxpayer,", "",
  "You owe $2,480.00 in unpaid federal taxes.", "A warrant for your ARREST will be issued", "TODAY unless payment is received.", "",
  "Pay immediately with Target or Apple", "GIFT CARDS. Call agent Mr. Smith at", "(555) 013-7788 and read the card numbers.", "",
  "Do not tell anyone about this notice.", "", "Internal Revenue Service"], "INTERNAL REVENUE SERVICE")
letter("demo/grandkid_note.png", ["Hi Grandma!", "", "Thank you for the cookies, they were the", "best ever. My soccer game is Saturday",
  "at 10am at Lincoln Park. Mom will pick", "you up at 9:30. Wear your sunhat!", "", "Love you,", "Leo"], "Note from Leo")
