/*
 * ROCK.C
 *
 *  COPYRIGHT : 1992 Echidna.
 * PROGRAMMER : Gregg A. Tavares
 *    VERSION : 00.000
 *    CREATED : 06/22/92
 *   MODIFIED : 06/23/92
 *       TABS : 05 09
 *
 *         \|///-_
 *         \oo///_
 *    -----w/-w------
 *     E C H I D N A
 *    ---------------
 *
 * DESCRIPTION
 *        
 *
 * HISTORY
 *
*/

#include <echidna/platform.h>
#include "switches.h"

#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <conio.h>
#include <dos.h>
#include <time.h>
#include <exec/types.h>
#include <echidna/argparse.h>
#include <echidna/eerrors.h>

/**************************** C O N S T A N T S ***************************/


/******************************** T Y P E S *******************************/

typedef struct {
    UBYTE     Chr;
    UBYTE     Attr;
} Pixel;

typedef struct {
    UBYTE     Flags;
    UWORD     Extra;        // Not Used Yet, use for whatever.
} Thing;

/****************************** G L O B A L S *****************************/


/******************************* M A C R O S ******************************/


/***************************** R O U T I N E S ****************************/


//;
//;ROCKFALL ROUTINE
//;

#define NUMPLAY   2            

#define MAPAREA   (MAPWIDTH * MAPHEIGHT)        // map area  
#define MAPAREAI  (MAPAREA - 1)                    // map area index

    // screen codes
#define SPACESYM  32        // space 
#define BORDERSYM 97        // border
#define DIRTSYM   98        // dirt 
#define DFSYM     99        // Dirty E. Face 
#define DFRSYM    100        // Dirty E. Face 
#define DFLSYM    101        // Dirty E. Face 
#define BUTTSYM   102        // butterfly
#define GUARDSYM  103        // guardian
#define DIAEXPLO  104        // diamond explosion
#define DIAEXPLO2 105        // diamond explosion
#define SPAEXPLO  106        // space explosion
#define SPAEXPLO2 107        // space explosion
#define AMEBASYM  108        // amoeba
#define MWALLSYM  109        // magic wall
#define EGGSYM    110        // monster egg
#define EGGWSYM   111        // egg wiggle
#define EGGHSYM   112        // egg hatch
#define EGGOSYM   113        // egg opening
#define WALLSYM   120        // wall
#define DIAMSYM   121        // diamond
#define ROCKSYM   122        // rock

#define MOVED     128        // Status value when moved
#define UNMOVED   127        
#define FALL      64        // added to status when falling
#define UNFALL    191        // Status value when FALLING
#define EGGTIME   63            
#define MOVEBITS  3            
#define UP        0            
#define RIGHT     1            
#define DOWN      2
#define LEFT      3            
#define PTS4      2             
#define PTS3      4            
#define PTS2      6            
#define PTS1      8            
#define PTS0      10            
#define GROWTHRATE 2            
#define CWISE     (-1)            
#define CCWISE    1

 
short     MAPWIDTH = 80;
short     MAPHEIGHT= 25;
short     SCRWIDTH = 80;

short     ExStP    = 0;             // explosion stack pointer
short     DFAnm    = DFRSYM;     // Dirt Face code
short     GrowFlag = 0;
short     ChangeSym= 0;
short     Wiggle   = 50;          // time till egg wiggles
short     Crack    = 58;           // time till egg cracks
short     Hatch    = 61;
short     NumPlayrs= 1;  

UBYTE     Input;

    // initial # of objects on screen
UWORD  InitAmebas=1;        // amoeba
UWORD  InitButts =5;        // butterflies
UWORD  InitDiams =10;        // diamonds
UWORD  InitGuards=3;        // Guards 
UWORD  InitRocks =80;        // rocks 
UWORD  InitWalls =0;        // walls
UWORD  InitMWalls=0;        // magic walls.
UWORD  AmebaCount=0;
UWORD  MaxAmebas =200;
UBYTE  AmebaMorph = EGGSYM;
UWORD  MagicFlag = FALSE;
UWORD  MagicTime = 250;

Pixel far    *Display;        // array placed over screen mem.

UBYTE Map[80 * 50];            // Map
Thing Status[80 * 50];        // Parallel Status array

UBYTE ExplStak[50];            // explosion stack
UBYTE Dead[NUMPLAY];        // Dirt Face death flag
UBYTE PushT[NUMPLAY];        // # of turns rocks have been pushed

UWORD PosStak[50];            // explosion stack, WARNING, could overflow!
UWORD DFPos[NUMPLAY];        // Dirt Face's pos.

short Direction[4];
    
short PushD[NUMPLAY];        // Rock Delay, number of times rock must be pushed.


/*********************************************************************
 *
 * DrawThing
 *
 * SYNOPSIS
 *        void DrawThing (UWORD pos)
 *
 * PURPOSE
 *        Draw a thing on the screen at map position POS
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void DrawThing (UWORD pos)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "DrawThing";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    {
        static UBYTE ConvertTable[][2] = { 
        {    '±', 0x1B,},    // 97        // border
        {    '∞', 0x19,},    // 98        // dirt 
        {    '', 0x1F,},    // 99        // Dirty E. Face 
        {    '>', 0x1F,},    // 100        // Dirty E. Face 
        {    '<', 0x1F,},    // 101        // Dirty E. Face 
        {    'X', 0x1B,},    // 102        // butterfly
        {    '#', 0x1E,},    // 103        // guardian
        {    '*', 0x1F,},    // 104        // diamond explosion
        {    'x', 0x1F,},    // 105        // diamond explosion
        {    '+', 0x1E,},    // 106        // space explosion
        {    '.', 0x1E,},    // 107        // space explosion
        {    '˜', 0x2A,},    // 108        // amoeba
        {    '±', 0x19,},    // 109        // magic wall
        {    '@', 0x1A,},    // 110        // monster egg
        {    'O', 0x1A,},    // 111        // egg wiggle
        {    'Q', 0x1A,},    // 112        // egg hatch
        {    'w', 0x1A,},    // 113        // egg opening
        {    ' ', 0x00,},    // 114
        {    ' ', 0x00,},    // 115
        {    ' ', 0x00,},    // 116
        {    ' ', 0x00,},    // 117
        {    ' ', 0x00,},    // 118
        {    ' ', 0x00,},    // 119
        {    '≤', 0x1C,},    // 120        // wall
        {    '', 0x1D,},    // 121        // diamond
        {    'Ï', 0x17,},    // 122        // rock
        };

        UBYTE    type;
        UBYTE    chr;
        UBYTE    attr;

        type = Map[pos];
        if (type == SPACESYM) {
            attr = 0x17;
            chr  = ' ';
        } else {
            attr = ConvertTable[type - 97][1];
            chr  = ConvertTable[type - 97][0];

            if (type == MWALLSYM && MagicFlag) {
                attr = (MagicTime & 1) ? 0x19 : 0x1B;
            }
        }
        pos = (pos / MAPWIDTH) * SCRWIDTH + pos % MAPWIDTH; 
        Display[pos].Chr  = chr;
        Display[pos].Attr = attr; 
    }

} /* DrawThing */

 
/*********************************************************************
 *
 * Place
 *
 * SYNOPSIS
 *        void Place(
 *                UBYTE Sym,
 *                UBYTE Stat,
 *                UBYTE Rep,
 *                UWORD Many)
 *
 * PURPOSE
 *        Place Many Sym's on the screen with Rep to the right and down.
 *
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void Place(
        UBYTE Sym,
        UBYTE stat,
        UBYTE Rep,
        UWORD Many)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "Place";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    {
          UWORD     count;
        UBYTE     r;
        UBYTE     c;
        UWORD     P;

        stat = stat;    // stat not used but could be to init direction.

          count = 0;
          while (count < Many) {

            // Set up things

              r = random (MAPHEIGHT - 1) + 1;
              c = random (MAPWIDTH  - 1) + 1 ;

              P = r * MAPWIDTH + c;
              if (Map[P] == DIRTSYM) {
                count++;
                Map[P] = Sym;
                DrawThing(P);

                if (Map[P + 1] == DIRTSYM) {
                    Map[P + 1] = Rep;
                    DrawThing(P + 1);
                }

                  if (Map[P + MAPWIDTH + 1] == DIRTSYM) {
                    Map[P + MAPWIDTH + 1] = Rep;
                    DrawThing(P + MAPWIDTH + 1);
                  }

                  if (Map[P + MAPWIDTH] == DIRTSYM) {
                    Map [P + MAPWIDTH] = Rep;
                    DrawThing(P + MAPWIDTH);
                }
            }
        }
    }

} /* Place */

/*********************************************************************
 *
 * InitWorld
 *
 * SYNOPSIS
 *        void InitWorld (void)
 *
 * PURPOSE
 *        Sets up initial random world within
 *        given parameters
 *        
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void InitWorld (void)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "InitWorld";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/
    {
        short    i;
        short    np;

        //
        // Fill the map with dirt.
        //
        for (i = 0; i < MAPAREA; i++) {

            Map[i]    = DIRTSYM;
            Status[i].Flags  = 0;
            Status[i].Extra  = 0;

            DrawThing (i);
        }

        Place(DIAMSYM,  0,    DIRTSYM,  InitDiams);
        Place(WALLSYM,  0,    DIRTSYM,  InitWalls);
        Place(ROCKSYM,  0,    DIRTSYM,  InitRocks);
        Place(GUARDSYM, UP,   SPACESYM, InitGuards);
        Place(BUTTSYM,  DOWN, SPACESYM, InitButts);
        Place(AMEBASYM, 0,    DIRTSYM,  InitAmebas);
        Place(MWALLSYM, 0,    DIRTSYM,  InitMWalls);

        //
        // Place the players in the upper left and upper right
        //
        DFPos[0] = MAPWIDTH + 1;
        DFPos[1] = MAPWIDTH * 2 - 2;

        //
        // Draw and init both players
        //
        for (i = 0; i < NumPlayrs; i++) {
            np = DFPos[i];
            Map[np] = DFSYM;
            DrawThing (np);
            Dead[i] = FALSE;
        }
    }
} /* InitWorld */
    
/*********************************************************************
 *
 * PrintWorld
 *
 * SYNOPSIS
 *        void PrintWorld (void)
 *
 * PURPOSE
 *        Print border
 *        
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void PrintWorld (void)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "PrintWorld";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    {
        short    i;
        short    pos;

        for (i = 0; i < MAPWIDTH; i++) {
            Map[i] = BORDERSYM;
            DrawThing (i);
            pos = MAPAREA - 1 - i;
            Map[pos] = BORDERSYM;
            DrawThing (pos);
        }

        for (i = 0; i < MAPHEIGHT; i++) {
            pos = i * MAPWIDTH;
            Map[pos] = BORDERSYM;
            DrawThing (pos);
            pos += MAPWIDTH - 1;
            Map[pos] = BORDERSYM;
            DrawThing (pos);
        }
    }
} /* PrintWorld */

/*********************************************************************
 *
 * AddScore
 *
 * SYNOPSIS
 *        void AddScore (short amount, player)
 *
 * PURPOSE
 *        Add Score to player.
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void AddScore (short amount, short player)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "AddScore";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    amount = amount;    // suppress unused warning
    player = player;    // suppress unused warning

} /* AddScore */

/*********************************************************************
 *
 * Explode
 *
 * SYNOPSIS
 *        void Explode (void)
 *
 * PURPOSE
 *        Sets 3x3 block of screen memory
 *        equal to Sym with upper left corner
 *        at Pos.
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void Explode (void)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "Explode";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    {
        UBYTE    Sym;
        UWORD    Pos;
        short    i;
        short    y;

        while (ExStP > 0) {
            Sym = ExplStak[ExStP];
            Pos = PosStak[ExStP];
            ExStP--;
            for (y = 0; y < 3; y++) {
                for (i = Pos; i <= Pos + 2; i++) {
                    if (Map[i] != BORDERSYM) {
                        Map[i] = Sym;
                        DrawThing (i);
                    }
                }
                Pos += MAPWIDTH;
            }
        }
    }
} /* Explode */

/*********************************************************************
 *
 * AddExplosion
 *
 * SYNOPSIS
 *        void AddExplosion (
 *                UBYTE    Sym,    // What is exploding, a buttfly or a guardian
 *                UWORD    Pos
 *                )
 *
 * PURPOSE
 *        Add an explosion to the explosion stack.
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void AddExplosion (
        UBYTE    Sym,    // What is exploding, a buttfly or a guardian
        UWORD    Pos
        )
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "AddExplosion";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    //
    // Should add stack checking
    //

    ExStP++;
    if (Sym == BUTTSYM) {
        ExplStak[ExStP] = DIAEXPLO;
    } else {
        ExplStak[ExStP] = SPAEXPLO;
    }
    PosStak[ExStP] = Pos;

} /* AddExplosion */

/*********************************************************************
 *
 * DoEnemy
 *
 * SYNOPSIS
 *        void DoEnemy (
 *                    UWORD    Pos,
 *                    short    Search,
 *                    UBYTE    Sym
 *                )
 *
 * PURPOSE
 *        moves enemy according to search 
 *        direction
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void DoEnemy (
            short    Pos,
            short    Search,
            UBYTE    Sym
        )
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "DoEnemy";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    {
        short    i;
        short    Dir;
        short    Scan;
        short    NP;

        Scan = -Search;
        Dir  = (Status[Pos].Flags + Search) & MOVEBITS;

        for (i = 0; i < 2; i++) {
            NP = Pos + Direction[Dir];
            if (Map[NP] == SPACESYM) {

                Map[Pos] = SPACESYM;
                DrawThing (Pos);

                Status[NP].Flags = Dir | MOVED;
                if (Dir == UP || Dir == LEFT) {
                    Status[NP].Flags &= UNMOVED;
                }
                Map[NP] = Sym;
                DrawThing (NP);
/**/            return;

            } else if ((Map[NP] == DFSYM ||
                        Map[NP] == DFRSYM ||
                        Map[NP] == DFLSYM) ||
                        Map[NP] == AMEBASYM ||
                       ((Status[NP].Flags & FALL) && Dir == 0)) {
                AddExplosion (Sym, Pos - (MAPWIDTH + 1));
/**/            return;
            }
            Dir = (Dir + Scan) & MOVEBITS;
        }

        Status[Pos].Flags = Dir;
    }
} /* DoEnemy */

/*********************************************************************
 *
 * DoAmeba
 *
 * SYNOPSIS
 *        void DoAmeba (
 *                UWORD    Pos        // mineral pos.
 *                )
 *
 * PURPOSE
 *        
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void DoAmeba (
        UWORD    Pos        // mineral pos.
        )
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "DoAmeba";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    {
        UBYTE    OldDir;
        UBYTE    Dir;
        UWORD    NP;

        AmebaCount++;
        if (ChangeSym == 0) {
            Dir = random (256) & MOVEBITS;
            OldDir = Dir;
            do {
                NP = Pos + Direction[Dir];
                if (Map[NP] == SPACESYM ||
                    Map[NP] == DIRTSYM) {

                    GrowFlag = TRUE;
                    if (random(256) < GROWTHRATE) {
                        Status[NP].Flags |= MOVED;
                        if (Dir == UP || Dir == LEFT) {
                            Status[NP].Flags &= UNMOVED;
                        }
                        Map[NP] = AMEBASYM;
                        DrawThing (NP);
/**/                    return;
                    }
                }
                Dir = (Dir + 1) & MOVEBITS;
            } while (Dir != OldDir);
        } else {
            Map[Pos] = ChangeSym;
            Status[Pos].Flags = 0;
            DrawThing (Pos);
        }
    }
} /* DoAmeba */

/*********************************************************************
 *
 * DoMineral
 *
 * SYNOPSIS
 *        void DoMineral (
 *                    UWORD    P,        // Mineral Pos.
 *                    UBYTE    MinSym    // symbol.
 *                )
 *
 * PURPOSE
 *        
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void DoMineral (
            UWORD    P,        // Mineral Pos.
            UBYTE    MinSym    // symbol.
        )
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "DoMineral";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

#define LDIAG    (MAPWIDTH - 1)
#define RDIAG    (MAPWIDTH + 1)

    {
        UWORD    NP;
        UBYTE    L;
        UBYTE    D;
        UBYTE    R;
        UBYTE    LD;
        UBYTE    RD;        // new positions.

        LD = Map[P + LDIAG];
        D  = Map[P + MAPWIDTH ];
        RD = Map[P + RDIAG];
        L  = Map[P - 1];
        R  = Map[P + 1];

        if (D >= MWALLSYM || D == SPACESYM) {
            if (D == SPACESYM) {
                Map[P] = SPACESYM;
                DrawThing (P);
                NP = P + MAPWIDTH;
                Map[NP] = MinSym;
                Status[NP].Flags = Status[P].Flags | FALL | MOVED;
                DrawThing (NP);
            } else if ((Status[P].Flags & FALL) && D == MWALLSYM) {

                UBYTE    Sym = SPACESYM;
                
                if (!MagicFlag) {
                    MagicFlag = TRUE;
                }

                NP = P + MAPWIDTH * 2;
                if (MagicTime && Map[NP] == SPACESYM) {
                    switch (MinSym) {
                    case EGGSYM:    Sym = GUARDSYM;        break;
                    case DIAMSYM:    Sym = ROCKSYM;        break;
                    case ROCKSYM:    Sym = DIAMSYM;        break;
                    }
                }
                Map[P] = SPACESYM;
                DrawThing (P);

                if (Sym != SPACESYM) {
                    Map[NP] = Sym;
                    Status[NP].Flags = Status[P].Flags | FALL | MOVED;
                    DrawThing (NP);
                }
            } else {

                if (LD == SPACESYM && L == SPACESYM) {
                    Map[P] = SPACESYM;
                    DrawThing (P);
                    NP = P - 1;
                    Map[NP] = MinSym;
                    Status[NP].Flags = Status[P].Flags | FALL;
                    DrawThing (NP);
                } else if (RD == SPACESYM && R == SPACESYM) {
                    Map[P] = SPACESYM;
                    DrawThing (P);
                    NP = P + 1;
                    Map[NP] = MinSym;
                    Status[NP].Flags = Status[P].Flags | FALL | MOVED;
                    DrawThing (NP);
                } else {
                    Status[P].Flags &= UNFALL;
                }
            }
        } else if ((Status[P].Flags & FALL) && D >= DFSYM && D <= GUARDSYM) {
            AddExplosion (D, P - 1);
        } else {
            Status[P].Flags &= UNFALL;
        }
    }

} /* DoMineral */

/*********************************************************************
 *
 * DoEgg
 *
 * SYNOPSIS
 *        void DoEgg (
 *                UWORD    Pos
 *                 )
 *
 * PURPOSE
 *        move egg and hatch it if
 *        it is time.
 *        
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void DoEgg (
        UWORD    Pos
         )
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "DoEgg";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/
    {
        UBYTE    Age;
        UWORD    ESym;

        if (!(Status[Pos].Flags & FALL)) {
            Status[Pos].Flags += 1;
        }
        
        Age = Status[Pos].Flags & EGGTIME;
        if (Age == Wiggle) {
            Map[Pos] = EGGWSYM;
            DrawThing (Pos);
        } else if (Age == Crack) {
            Map[Pos] = EGGHSYM;
            DrawThing (Pos);
        } else if (Age >= Hatch) {
            Map[Pos] = BUTTSYM;
            DrawThing (Pos);
        }

        ESym = Map[Pos];
        if (ESym != BUTTSYM) {
            DoMineral (Pos, ESym);
        }
    }
} /* DoEgg */

/*********************************************************************
 *
 * NextGen
 *
 * SYNOPSIS
 *        void NextGen (void)
 *
 * PURPOSE
 *        Scans entire playfield  processing
 *        each object according to its type
 *        
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void NextGen (void)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "NextGen";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/
    {
        UWORD        SI;
        UBYTE        Type;

        AmebaCount = 0;
        GrowFlag   = FALSE;
        
        SI = 0;
        do {
            Type = Map[SI];

            if (Type > DIRTSYM) {

                if ((Status[SI].Flags & MOVED)) {
                    Status[SI].Flags &= UNMOVED;
                } else if (Type == ROCKSYM) {
                    DoMineral (SI, ROCKSYM);
                } else if (Type == DIAMSYM) {
                    DoMineral (SI, DIAMSYM);
                } else if (Type == GUARDSYM) {
                    DoEnemy (SI, CCWISE, GUARDSYM);
                } else if (Type == BUTTSYM) {
                    DoEnemy (SI, CWISE, BUTTSYM);
                } else if (Type >= EGGSYM &&
                              Type <= EGGHSYM) {
                    DoEgg (SI);
                } else if (Type == AMEBASYM) {
                    DoAmeba(SI);
                } else if (Type == DIAEXPLO ||
                              Type == SPAEXPLO) {
                    Map[SI] += 1;
                    DrawThing (SI);
                } else if (Type == DIAEXPLO2) {
                    Map[SI] = EGGSYM;
                    DrawThing (SI);
                } else if (Type == SPAEXPLO2) {
                    Map[SI] = SPACESYM;
                    DrawThing (SI);
                } else if (MagicFlag && Type == MWALLSYM && MagicTime) {
                    DrawThing (SI);    // to flag magic walls.
                }
            }
            SI++;
        } while (SI != MAPAREA);
        
        if (GrowFlag == FALSE) {
            ChangeSym = DIAMSYM;
        } else if (AmebaCount >= MaxAmebas) {
            ChangeSym = AmebaMorph;
        }
    }
} /* NextGen */

/*********************************************************************
 *
 * DirtFace
 *
 * SYNOPSIS
 *        void DirtFace (UBYTE P)
 *
 * PURPOSE
 *        Move Dirt E. Face
 *        
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void DirtFace (UBYTE P)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "DirtFace";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/
    {
        short    D;
        UWORD    DFP;
        UWORD    NP;
        UWORD    Q;
        UBYTE    C;

        DFP = DFPos[P];
        D = 0;
        if (Input == 'd') { D =         1; DFAnm = DFRSYM; }    // right
        if (Input == 'a') { D =        -1; DFAnm = DFLSYM; }    // left
        if (Input == 'x') { D =  MAPWIDTH; }                    // down
        if (Input == 'w') { D = -MAPWIDTH; }                    // up

        Map[DFP] = DFAnm;

        if (Input == 0) {                                        // nothing pressed
            Map[DFP] = DFSYM;
        }
        DrawThing (DFP);

        NP = DFP + D;            // new position
        C  = Map[NP];    // Chr at new position

        if (C == DIAMSYM) {
            AddScore (100, P);
        }
        if (C <= EGGSYM && C >= EGGOSYM) {
            AddScore (10, P);
        }
        if (C == DIRTSYM) {
            AddScore (1, P);
        }

        if (Input == ' ') {  // Fire Button, should be using better routines.
            if (C == DIRTSYM || C == DIAMSYM || (C >= EGGSYM && C <= EGGHSYM)) {
                Map[NP] = SPACESYM;
                DrawThing (NP);
            }
        } else if (C == DIRTSYM || C == SPACESYM || C == DIAMSYM || (C >= EGGSYM && C <= EGGHSYM)) {
            
            // move Dirt Face

            Map[DFP] = SPACESYM;
            DrawThing (DFP);
            DFP = NP;
            Map[DFP] = DFAnm;
            DrawThing (DFP);
        } else if (Map[NP] == ROCKSYM && (D != -MAPWIDTH)) {
            
            // push rocks

            if (PushD[P] == D) {
                PushT[P]--;
                if (PushT[P] == 0) {
                
                    // move rock

                    Q = NP;
                    do {
                        Q += D;
                        if (Map[Q - MAPWIDTH] == ROCKSYM) {
                            Q = 0;
                        }
                    } while (Map[Q] == ROCKSYM && Q != 0);

                    if (Q != 0 && Map[Q] == SPACESYM) {
                        Map[DFP] = SPACESYM;
                        DrawThing (DFP);
                        DFP = NP;
                        Map[DFP] = DFAnm;
                        DrawThing (DFP);
                        Map[Q] = ROCKSYM;
                        DrawThing (Q);
                    }

                    PushD[P] = 0;
                }
            } else { // start pushing rocks
                PushT[P] = 0;
                Q = NP;
                do {
                    Q += D;
                    PushT[P] ++;
                } while (Map[Q] == ROCKSYM && Map[Q - MAPWIDTH] != ROCKSYM);

                if (Map[Q] != SPACESYM) {
                    PushD[P] = 0;    // can't push
                } else {
                    PushD[P] = D;    // can push
                }
            }
        }
        DFPos[P] = DFP;
    }

} /* DirtFace */

/*********************************************************************
 *
 * InitGame
 *
 * SYNOPSIS
 *        void InitGame (void)
 *
 * PURPOSE
 *        
 *
 * INPUT
 *
 *
 * EFFECTS
 *
 *
 * RETURN VALUE
 *
 *
 * HISTORY
 *
 *
 * SEE ALSO
 *
*/
void InitGame (void)
{

/*-------------------------------------------------------------------------*/
#if FUNC_NAMES
 CurrentFuncName = "InitGame";
#endif
#if REQUIRE

#endif
/*-------------------------------------------------------------------------*/

    {
        ExStP = 0;         //init explosion stack

        MagicTime = 400;
        MagicFlag = FALSE;

        Direction[0] = -MAPWIDTH;
        Direction[1] = 1;
        Direction[2] = MAPWIDTH;
        Direction[3] = -1;

    }
} /* InitGame */

/***************************** T E M P L A T E ****************************/

#define ARG_MAPWIDTH        (newargs[ 0])
#define ARG_MAPHEIGHT        (newargs[ 1])
#define ARG_SCRWIDTH        (newargs[ 2])
#define ARG_NUMPLAYERS        (newargs[ 3])
#define ARG_AMEBAS            (newargs[ 4])
#define ARG_BUTTS            (newargs[ 5])
#define ARG_GUARDS            (newargs[ 6])
#define ARG_DIAMONDS        (newargs[ 7])
#define ARG_ROCKS            (newargs[ 8])
#define ARG_WALLS            (newargs[ 9])
#define ARG_MAGICWALLS        (newargs[10])
#define ARG_MAXAMEBAS        (newargs[11])
#define ARG_DELAY            (newargs[12])
#define ARG_MORPH            (newargs[13])

char Usage[] = "Usage: ROCK [switches...]\n";

ArgSpec Template[] = {
{    CHRKEYWORD_ARG,                    "W",        "\t-W<number>    = width in chars\n", },
{    CHRKEYWORD_ARG,                    "H",        "\t-H<number>    = height in chars\n", },
{    CHRKEYWORD_ARG,                    "S",        "\t-S<number>    = screen width\n", },
{    CHRKEYWORD_ARG,                    "P",        "\t-P<number>    = number of players\n", },
{    CHRKEYWORD_ARG,                    "A",        "\t-A<number>    = number of amebas\n", },
{    CHRKEYWORD_ARG,                    "B",        "\t-B<number>    = number of butterflys\n", },
{    CHRKEYWORD_ARG,                    "G",        "\t-G<number>    = number of guardians\n", },
{    CHRKEYWORD_ARG,                    "D",        "\t-D<number>    = number of diamonds\n", },
{    CHRKEYWORD_ARG,                    "R",        "\t-R<number>    = number of rocks\n", },
{    CHRKEYWORD_ARG,                    "V",        "\t-V<number>    = number of walls\n", },
{    CHRKEYWORD_ARG,                    "M",        "\t-M<number>    = number of magic walls\n", },
{    CHRKEYWORD_ARG,                    "X",        "\t-X<number>    = max amebas\n", },
{    CHRKEYWORD_ARG,                    "T",        "\t-T<number>    = delay Time\n", },
{    CHRKEYWORD_ARG,                    "C",        "\t-C<number>    = What Ameba changes too\n"
                                                "\t                110 = Egg, 120 = Wall, 122 = Rock,\n"
                                                "\t                102 = Butterfly, 103 = Guard, 32 = Space,\n", },
{    0, NULL, NULL, },
};

/********************************** MAIN **********************************/

int main(int argc, char **argv)
{
    char            **newargs;
    short             i;
    short             Delay = 100;
    UWORD             NP;


    newargs = argparse (argc, argv, Template);

    if (!newargs) {
        printf ("%s\n", GlobalErrMsg);
        printarghelp (Usage, Template);
        return EXIT_FAILURE;
    } else {

        if (ARG_MAPWIDTH    )    { MAPWIDTH   = atoi (ARG_MAPWIDTH    ); }
        if (ARG_MAPHEIGHT    )    { MAPHEIGHT  = atoi (ARG_MAPHEIGHT    ); }
        if (ARG_SCRWIDTH    )    { SCRWIDTH   = atoi (ARG_SCRWIDTH    ); }
        if (ARG_NUMPLAYERS    )    { NumPlayrs  = atoi (ARG_NUMPLAYERS    ); }
        if (ARG_AMEBAS        )    { InitAmebas = atoi (ARG_AMEBAS        ); }
        if (ARG_BUTTS        )    { InitButts  = atoi (ARG_BUTTS        ); }
        if (ARG_DIAMONDS    )    { InitDiams  = atoi (ARG_DIAMONDS    ); }
        if (ARG_GUARDS        )    { InitGuards = atoi (ARG_GUARDS        ); }
        if (ARG_ROCKS        )    { InitRocks  = atoi (ARG_ROCKS        ); }
        if (ARG_WALLS        )    { InitWalls  = atoi (ARG_WALLS        ); }
        if (ARG_MAGICWALLS    )    { InitMWalls = atoi (ARG_MAGICWALLS    ); }
        if (ARG_MAXAMEBAS    )    { MaxAmebas  = atoi (ARG_MAXAMEBAS    ); }
        if (ARG_DELAY        )    { Delay      = atoi (ARG_DELAY        ); }
        if (ARG_MORPH        )    { AmebaMorph = atoi (ARG_MORPH        ); }

        Display = MK_FP (0xB800, 0x0000);

        do {
            randomize ();
            InitGame ();
             InitWorld ();
            PrintWorld ();

            ChangeSym = 0;
            do {

                //
                // Note: Need to read controls for 2 players, not just 1
                //
                Input = 0;
                while (kbhit()) {
                    Input = getch ();
                }
/* abort */        if (Input == 27)   { exit (0); }    // [ESC], Abort
                if (Input == 'r') { break;     }        // [R], Restart

                NextGen ();
                Explode ();

                if (MagicFlag && MagicTime) {
                    MagicTime--;
                }

                for (i = 0; i < NumPlayrs; i++) {
                    NP = DFPos[i];
                    if (Map[NP] >= DFSYM &&
                        Map[NP] <= DFLSYM &&
                        Dead[i] == FALSE) {
                    
                        DirtFace (i);
                    } else {
                        Dead[i] = TRUE;
                    }
                }

                delay (Delay);
            } while (1);
        } while (1);
    }
}
