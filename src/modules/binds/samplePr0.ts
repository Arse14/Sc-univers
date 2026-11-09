/** Profil Logitech X56 par défaut (structure des commandes, aucune assignation) : sert de démo hors Tauri et de test. */
export const SAMPLE_X56_PR0 = String.raw`[profile=Untitled version=0x00000005
  [controllers
    [controller=a878de15-5a3e-44b3-8128-6ccbbe905bd2 group='X-56 Control System'
      [member=5572b81b-c76b-40fa-8fb6-a3ee6d1a870c name=Stick shortname=Stick]
      [controls
        [button=0x00090001 name=Trigger]
        [button=0x00090002 name=A]
        [button=0x00090003 name=B]
        [button=0x00090005 name=D]
        [button=0x00090006 name=Pinky]
        [hat=0x00090007 name=H1]
        [hat=0x0009000B name=H2]
        [slider name=Mode
          [button=0x0009000F name='Mode 1' latchable=false]
          [button=0x00090010 name='Mode 2' latchable=false]
          [button=0x00090011 name='Mode 3' latchable=false]]
        [hat=0x00010039 name=POV]
        [axis=0x00010030 name='X Axis']
        [axis=0x00010031 name='Y Axis']
        [axis=0x00010035 name=Twist]
        [ministick=0x00090004 name='C Stick'
          [button=0x00090004 name='C Stick Click']
          [axis=0x00010033 name='C Stick X']
          [axis=0x00010034 name='C Stick Y']]]
      [shifts
        [shift=346dbae3-9684-4b7d-9943-887e7a32d02c name=Mode1
          [selectionset
            [buttoncombo
              [buttonhid=0x0009000F]]]]
        [shift=c5d5facc-3147-4209-8bee-ea0864f09c02 fallback=c5d5facc-3147-4209-8bee-ea0864f09c02 name=Mode2
          [selectionset
            [buttoncombo
              [buttonhid=0x00090010]]]]
        [shift=952c5f2c-9187-4327-9132-32ea022f0d6d fallback=952c5f2c-9187-4327-9132-32ea022f0d6d name=Mode3
          [selectionset
            [buttoncombo
              [buttonhid=0x00090011]]]]]]
    [controller=f10e3b85-8822-4cd5-9a18-d6bd299c26d8 group='X-56 Control System'
      [member=1c5dc848-7201-4f31-b32f-ad723903e03e name=Throttle shortname=Throttle]
      [controls
        [button=0x00090001 name=E]
        [button=0x00090002 name='F Push']
        [button=0x00090003 name='G Push']
        [button=0x00090004 name=I]
        [button=0x00090005 name=H]
        [button=0x00090006 name='SW 1']
        [button=0x00090007 name='SW 2']
        [button=0x00090008 name='SW 3']
        [button=0x00090009 name='SW 4']
        [button=0x0009000A name='SW 5']
        [button=0x0009000B name='SW 6']
        [button=0x0009000C name='TGL 1 Up']
        [button=0x0009000D name='TGL 1 Down']
        [button=0x0009000E name='TGL 2 Up']
        [button=0x0009000F name='TGL 2 Down']
        [button=0x00090010 name='TGL 3 Up']
        [button=0x00090011 name='TGL 3 Down']
        [button=0x00090012 name='TGL 4 Up']
        [button=0x00090013 name='TGL 4 Down']
        [hat=0x00090014 name=H3]
        [hat=0x00090018 name=H4]
        [button=0x0009001C name='K1 Up']
        [button=0x0009001D name='K1 Down']
        [button=0x0009001E name='Scroll FWD']
        [button=0x0009001F name='Scroll BCK']
        [slider name=Mode
          [button=0x00090022 name='Mode 1' latchable=false]
          [button=0x00090023 name='Mode 2' latchable=false]
          [button=0x00090024 name='Mode 3' latchable=false]]
        [button=0x00090021 name=SLD]
        [axis=0x00010030 name='Left Throttle']
        [axis=0x00010031 name='Right Throttle']
        [axis=0x00010032 name='Rotary 1']
        [axis=0x00010035 name='Rotary 2']
        [axis=0x00010037 name='Rotary 3']
        [axis=0x00010036 name='Rotary 4']
        [ministick=0x00090020 name='Mouse Ministick'
          [button=0x00090020 name='Mouse Ministick Click']
          [axis=0x00010033 name='Mouse X Axis']
          [axis=0x00010034 name='Mouse Y Axis']]]
      [shifts
        [shift=346dbae3-9684-4b7d-9943-887e7a32d02c name=Mode1
          [selectionset
            [buttoncombo
              [buttonhid=0x00090022]]]]
        [shift=c5d5facc-3147-4209-8bee-ea0864f09c02 fallback=c5d5facc-3147-4209-8bee-ea0864f09c02 name=Mode2
          [selectionset
            [buttoncombo
              [buttonhid=0x00090023]]]]
        [shift=952c5f2c-9187-4327-9132-32ea022f0d6d fallback=952c5f2c-9187-4327-9132-32ea022f0d6d name=Mode3
          [selectionset
            [buttoncombo
              [buttonhid=0x00090024]]]]]]]
]`;
