"""Gera os assets das lojas a partir de assets/logo.png (fundo transparente).

Saidas em store/:
  icon-512.png            -> icone Play Store (512x512, sem transparencia)
  icon-1024-ios.png       -> icone App Store iOS (1024x1024, sem transparencia)
  feature-graphic.png     -> banner Play Store (1024x500)
Tambem atualiza assets/icon.png (1024) com o mesmo design.
"""
import os

from PIL import Image, ImageDraw, ImageFont

BG = (13, 13, 13, 255)  # #0D0D0D
GREEN = (0, 166, 81)  # #00A651
FONT_SEMI = 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'
FONT_REG = 'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'

logo = Image.open('assets/logo.png').convert('RGBA')
os.makedirs('store', exist_ok=True)


def fit(img, w):
    r = w / img.width
    return img.resize((int(img.width * r), int(img.height * r)), Image.LANCZOS)


def radial_glow(size, color, alpha_max, radius_frac):
    """Brilho radial: alpha_max no centro, 0 a partir de radius_frac."""
    g = Image.radial_gradient('L').resize((size, size), Image.LANCZOS)
    # radial_gradient: 0 no centro -> 255 na borda; converte em alpha decrescente
    lut = []
    for v in range(256):
        t = v / 255 / radius_frac
        a = max(0.0, 1.0 - t)
        lut.append(int(alpha_max * a))
    alpha = g.point(lut)
    glow = Image.new('RGBA', (size, size), color + (0,))
    glow.putalpha(alpha)
    return glow


def make_icon(size):
    img = Image.new('RGBA', (size, size), BG)
    glow = radial_glow(int(size * 1.25), GREEN, alpha_max=70, radius_frac=0.62)
    img.alpha_composite(glow, ((size - glow.width) // 2, (size - glow.height) // 2))
    l = fit(logo, int(size * 0.80))
    img.alpha_composite(l, ((size - l.width) // 2, (size - l.height) // 2))
    return img.convert('RGB')  # lojas nao aceitam transparencia


def make_feature_graphic():
    w, h = 1024, 500
    img = Image.new('RGBA', (w, h), BG)
    # brilho verde atras da logo (lado esquerdo)
    glow = radial_glow(700, GREEN, alpha_max=80, radius_frac=0.65)
    img.alpha_composite(glow, (40, (h - glow.height) // 2))
    # logo a esquerda
    l = fit(logo, 380)
    img.alpha_composite(l, (90, (h - l.height) // 2))
    # textos a direita
    draw = ImageDraw.Draw(img)
    f_titulo = ImageFont.truetype(FONT_SEMI, 54)
    f_sub = ImageFont.truetype(FONT_REG, 30)
    x = 540
    draw.text((x, 168), 'App do Assinante', font=f_titulo, fill=(255, 255, 255))
    draw.text((x, 248), 'Fatura em um toque, PIX,', font=f_sub, fill=(160, 160, 160))
    draw.text((x, 292), 'teste de velocidade e mais.', font=f_sub, fill=(160, 160, 160))
    # detalhe: barra verde sob o titulo
    draw.rounded_rectangle([x, 240, x + 64, 246], radius=3, fill=GREEN)
    return img.convert('RGB')


make_icon(512).save('store/icon-512.png')
make_icon(1024).save('store/icon-1024-ios.png')
make_icon(1024).convert('RGBA').save('assets/icon.png')
make_feature_graphic().save('store/feature-graphic.png')
print('OK: store/icon-512.png, store/icon-1024-ios.png, store/feature-graphic.png, assets/icon.png')
