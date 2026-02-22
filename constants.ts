export const EXAMPLE_LOG = `Media device information
------------------------
driver          qcom-camss
model           Qualcomm Camera Subsystem

Device topology
- entity 1: msm_csiphy0 (2 pads, 5 links, 0 routes)
            type V4L2 subdev subtype Unknown flags 0
            device node name /dev/v4l-subdev0
        pad0: Sink
                [stream:0 fmt:UYVY8_1X16/1920x1080 field:none colorspace:srgb]
        pad1: Source
                [stream:0 fmt:UYVY8_1X16/1920x1080 field:none colorspace:srgb]
                -> "msm_csid0":0 []

- entity 16: msm_csid0 (5 pads, 22 links, 0 routes)
             type V4L2 subdev subtype Unknown flags 0
             device node name /dev/v4l-subdev5
        pad0: Sink
                [stream:0 fmt:SRGGB10_1X10/1640x1232 field:none colorspace:srgb]
                <- "msm_csiphy0":1 []
        pad1: Source
                [stream:0 fmt:SRGGB10_1X10/1640x1232 field:none colorspace:srgb]
                -> "msm_vfe0_rdi0":0 [ENABLED]

- entity 46: msm_vfe0_rdi0 (2 pads, 6 links, 0 routes)
             type V4L2 subdev subtype Unknown flags 0
             device node name /dev/v4l-subdev10
        pad0: Sink
                [stream:0 fmt:SRGGB10_1X10/1640x1232 field:none colorspace:srgb]
                <- "msm_csid0":1 [ENABLED]
        pad1: Source
                [stream:0 fmt:SRGGB10_1X10/1640x1232 field:none colorspace:srgb]
                -> "msm_vfe0_video0":0 [ENABLED,IMMUTABLE]

- entity 49: msm_vfe0_video0 (1 pad, 1 link)
             type Node subtype V4L flags 0
             device node name /dev/video0
        pad0: Sink
                <- "msm_vfe0_rdi0":1 [ENABLED,IMMUTABLE]
`;
