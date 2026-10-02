import sys
A = """
X.X.X..........X..
X.X.X.........XXX.
XXXXX.........XXX.
..X...X.....X.XXX.
..X....X...X...X..
..X...XXXXXXX..X..
..X..XX.XXX.XX.X..
.XXXXXXXXXXXXXXXX.
.XXXX.XXXXXXX.XXX.
..X.X.X.....X.XX..
..X....XX.XX...X..
"""
def svg(grid, fg, bg=None, pad=1, name=''):
    rows=[r for r in grid.strip('\n').split('\n')]
    w=max(len(r) for r in rows); h=len(rows)
    W=w+2*pad; H=h+2*pad; side=max(W,H)
    ox=(side-w)/2; oy=(side-h)/2
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" shape-rendering="crispEdges">']
    if bg: out.append(f'<rect width="{side}" height="{side}" fill="{bg}"/>')
    d=[]
    for y,r in enumerate(rows):
        x=0
        while x<len(r):
            if r[x]=='X':
                s=x
                while x<len(r) and r[x]=='X': x+=1
                d.append(f'M{ox+s} {oy+y}h{x-s}v1h-{x-s}z')
            else: x+=1
    out.append(f'<path fill="{fg}" d="{"".join(d)}"/></svg>')
    return '\n'.join(out)
open(sys.argv[1]+'/inv-light.svg','w').write(svg(A,'#1F6B4E'))
open(sys.argv[1]+'/inv-tile.svg','w').write(svg(A,'#141C18','#4FBF8E',pad=2))
